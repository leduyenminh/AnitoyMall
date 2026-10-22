import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Aws,
  CfnOutput,
  Duration,
  IgnoreMode,
  RemovalPolicy,
  SecretValue,
  Stack,
  type StackProps,
  aws_certificatemanager as acm,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_cloudwatch as cloudwatch,
  aws_cloudwatch_actions as cwActions,
  aws_dynamodb as dynamodb,
  aws_ecr_assets as ecrAssets,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_lambda_event_sources as eventSources,
  aws_lambda_nodejs as nodejs,
  aws_logs as logs,
  aws_s3 as s3,
  aws_scheduler as scheduler,
  aws_scheduler_targets as schedulerTargets,
  aws_secretsmanager as secretsmanager,
  aws_sns as sns,
  aws_sns_subscriptions as subscriptions,
  aws_sqs as sqs,
} from "aws-cdk-lib";
import type { Construct } from "constructs";

/** Repository root (this file lives in infra/lib). */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export interface AnitoyMallStackProps extends StackProps {
  stage: string;
  domainName?: string;
  certificateArn?: string;
  alarmEmail?: string;
  sesFromEmail?: string;
  sellerEmail?: string;
  /** Hours an unconfirmed COD / bank-transfer order holds stock before it is cancelled (app default 24). */
  orderHoldHours?: string;
  /** NEXT_PUBLIC_* values passed to the Next.js build. */
  publicEnv: Record<string, string>;
}

/**
 * Serverless storefront:
 *
 *   Viewer ─▶ CloudFront ─┬─▶ Lambda (Next.js via Lambda Web Adapter, streaming) ─▶ DynamoDB
 *                         └─▶ S3 (/media: product images mirrored from TikTok Shop)
 *   Storefront ─▶ SQS ─▶ events worker (order side effects, TikTok webhooks) ─▶ TikTok Shop API
 *   EventBridge Scheduler (15 min) ─▶ sync worker (token refresh + catalog/inventory reconcile)
 *
 * Everything scales to zero; a small shop pays mostly for CloudFront traffic.
 */
export class AnitoyMallStack extends Stack {
  constructor(scope: Construct, id: string, props: AnitoyMallStackProps) {
    super(scope, id, props);

    if (props.domainName && !props.certificateArn) {
      throw new Error("certificateArn (ACM, us-east-1) is required when domainName is set");
    }
    const configuredSiteUrl = props.domainName ? `https://${props.domainName}` : undefined;
    const logRetention = logs.RetentionDays.ONE_MONTH;

    // ---------------------------------------------------------------- Data
    const table = new dynamodb.TableV2(this, "Table", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand(),
      globalSecondaryIndexes: [
        {
          indexName: "GSI1",
          partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
          sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
        },
      ],
      timeToLiveAttribute: "expiresAt",
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      deletionProtection: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const mediaBucket = new s3.Bucket(this, "Media", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // ---------------------------------------------------------------- Secrets
    // TikTok Shop app credentials (filled in by the operator) and OAuth tokens (written by the app).
    const tiktokSecret = new secretsmanager.Secret(this, "TikTokShopSecret", {
      description: "TikTok Shop app credentials and seller OAuth tokens (JSON)",
      secretStringValue: SecretValue.unsafePlainText(
        JSON.stringify({ appKey: "", appSecret: "", serviceId: "", eventsAccessToken: "" }),
      ),
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const adminSecret = new secretsmanager.Secret(this, "AdminSecret", {
      description: "Basic-auth credentials for /admin",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "admin" }),
        generateStringKey: "password",
        excludePunctuation: true,
        passwordLength: 24,
      },
    });
    // Merchant keys for ZaloPay / MoMo / VNPay. Empty values keep that method switched off.
    const paymentsSecret = new secretsmanager.Secret(this, "PaymentsSecret", {
      description: "Online payment gateway credentials (JSON): ZaloPay, MoMo, VNPay",
      secretStringValue: SecretValue.unsafePlainText(
        JSON.stringify({
          ZALOPAY_APP_ID: "",
          ZALOPAY_KEY1: "",
          ZALOPAY_KEY2: "",
          ZALOPAY_ENDPOINT: "https://sb-openapi.zalopay.vn",
          MOMO_PARTNER_CODE: "",
          MOMO_ACCESS_KEY: "",
          MOMO_SECRET_KEY: "",
          MOMO_ENDPOINT: "https://test-payment.momo.vn",
          VNPAY_TMN_CODE: "",
          VNPAY_HASH_SECRET: "",
          VNPAY_PAY_URL: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
        }),
      ),
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const originSecret = new secretsmanager.Secret(this, "OriginVerifySecret", {
      description: "Shared secret CloudFront sends to the Lambda origin",
      generateSecretString: { excludePunctuation: true, passwordLength: 40 },
    });

    // ---------------------------------------------------------------- Events queue
    const deadLetters = new sqs.Queue(this, "EventsDLQ", {
      retentionPeriod: Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      enforceSSL: true,
    });
    const events = new sqs.Queue(this, "Events", {
      visibilityTimeout: Duration.minutes(6), // ≥ 6× the worker timeout
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      enforceSSL: true,
      deadLetterQueue: { queue: deadLetters, maxReceiveCount: 5 },
    });

    // ---------------------------------------------------------------- Storefront (Next.js)
    const storefront = new lambda.DockerImageFunction(this, "Storefront", {
      description: "Mall of Anitoy Next.js storefront (Lambda Web Adapter)",
      code: lambda.DockerImageCode.fromImageAsset(ROOT, {
        file: "Dockerfile",
        target: "lambda",
        platform: ecrAssets.Platform.LINUX_AMD64,
        ignoreMode: IgnoreMode.DOCKER,
        buildArgs: {
          ...props.publicEnv,
          ...(configuredSiteUrl ? { NEXT_PUBLIC_SITE_URL: configuredSiteUrl } : {}),
        },
      }),
      architecture: lambda.Architecture.X86_64,
      memorySize: 1536,
      timeout: Duration.seconds(30),
      environment: {
        DATA_BACKEND: "dynamodb",
        TABLE_NAME: table.tableName,
        EVENTS_QUEUE_URL: events.queueUrl,
        TIKTOK_SECRET_ARN: tiktokSecret.secretArn,
        ADMIN_SECRET_ARN: adminSecret.secretArn,
        PAYMENTS_SECRET_ARN: paymentsSecret.secretArn,
        // Resolved by CloudFormation at deploy time; requests without it are rejected.
        ORIGIN_VERIFY_SECRET: originSecret.secretValue.unsafeUnwrap(),
        ...(configuredSiteUrl ? { SITE_URL: configuredSiteUrl } : {}),
        ...(props.orderHoldHours ? { ORDER_HOLD_HOURS: props.orderHoldHours } : {}),
      },
      logGroup: new logs.LogGroup(this, "StorefrontLogs", { retention: logRetention, removalPolicy: RemovalPolicy.DESTROY }),
    });
    const storefrontUrl = storefront.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });

    table.grantReadWriteData(storefront);
    events.grantSendMessages(storefront);
    tiktokSecret.grantRead(storefront);
    tiktokSecret.grantWrite(storefront); // OAuth callback stores the seller's tokens
    adminSecret.grantRead(storefront);
    paymentsSecret.grantRead(storefront);

    // ---------------------------------------------------------------- CDN
    // Behind CloudFront the Host header is the Lambda URL; pass the public host along. Also pass the
    // viewer's IP in a header the viewer cannot set (it is overwritten here), for rate limiting.
    const forwardHost = new cloudfront.Function(this, "ForwardHost", {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      comment: "Expose the viewer Host and IP to the origin",
      code: cloudfront.FunctionCode.fromInline(
        [
          "function handler(event) {",
          "  var request = event.request;",
          "  request.headers['x-forwarded-host'] = { value: request.headers.host.value };",
          "  request.headers['x-viewer-ip'] = { value: event.viewer.ip };",
          "  return request;",
          "}",
        ].join("\n"),
      ),
    });

    const appOrigin = new origins.FunctionUrlOrigin(storefrontUrl, {
      customHeaders: { "x-origin-verify": originSecret.secretValue.unsafeUnwrap() },
      readTimeout: Duration.seconds(30),
    });
    const mediaOrigin = origins.S3BucketOrigin.withOriginAccessControl(mediaBucket);

    // HTML and RSC payloads: honour Next's Cache-Control (ISR s-maxage / no-store) and keep the
    // router headers in the key so HTML and RSC responses for one URL never mix.
    const pageCache = new cloudfront.CachePolicy(this, "PageCache", {
      comment: "Next.js pages: origin-controlled TTL, RSC-aware cache key",
      minTtl: Duration.seconds(0),
      defaultTtl: Duration.seconds(0),
      maxTtl: Duration.days(365),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        "rsc",
        "next-router-prefetch",
        "next-router-state-tree",
        "next-router-segment-prefetch",
        "next-url",
      ),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });
    // Optimised images vary by size/quality (query) and format (Accept: AVIF/WebP).
    const imageCache = new cloudfront.CachePolicy(this, "ImageCache", {
      comment: "next/image responses",
      minTtl: Duration.seconds(0),
      defaultTtl: Duration.days(1),
      maxTtl: Duration.days(365),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList("accept"),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });
    // Admin: Basic-auth header must reach the origin; responses are never cached (TTL ≤ 1s, no-store).
    const adminCache = new cloudfront.CachePolicy(this, "AdminCache", {
      comment: "Admin area: forwards Authorization, effectively uncached",
      minTtl: Duration.seconds(0),
      defaultTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(1),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList("authorization"),
      cookieBehavior: cloudfront.CacheCookieBehavior.all(),
    });

    const viewerRequest = [{ function: forwardHost, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }];
    const appBehavior = (
      cachePolicy: cloudfront.ICachePolicy,
      allowedMethods = cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
    ): cloudfront.BehaviorOptions => ({
      origin: appOrigin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods,
      cachePolicy,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
      functionAssociations: viewerRequest,
      compress: true,
    });

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: `Mall of Anitoy (${props.stage})`,
      defaultBehavior: appBehavior(pageCache),
      additionalBehaviors: {
        "/_next/static/*": appBehavior(cloudfront.CachePolicy.CACHING_OPTIMIZED),
        "/_next/image*": appBehavior(imageCache),
        "/art/*": appBehavior(cloudfront.CachePolicy.CACHING_OPTIMIZED),
        "/media/*": {
          origin: mediaOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          compress: true,
        },
        "/api/admin/*": appBehavior(adminCache, cloudfront.AllowedMethods.ALLOW_ALL),
        "/api/*": appBehavior(cloudfront.CachePolicy.CACHING_DISABLED, cloudfront.AllowedMethods.ALLOW_ALL),
        "/admin*": appBehavior(adminCache),
        "/en/admin*": appBehavior(adminCache),
      },
      domainNames: props.domainName ? [props.domainName] : undefined,
      certificate: props.certificateArn
        ? acm.Certificate.fromCertificateArn(this, "Certificate", props.certificateArn)
        : undefined,
      // Only configurable with a custom certificate; the default *.cloudfront.net one is fixed.
      minimumProtocolVersion: props.certificateArn ? cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021 : undefined,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      // Includes edge locations in Vietnam and the rest of Asia.
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
    });

    const siteUrl = configuredSiteUrl ?? `https://${distribution.distributionDomainName}`;

    // ---------------------------------------------------------------- Workers
    const workerEnv: Record<string, string> = {
      ...props.publicEnv,
      DATA_BACKEND: "dynamodb",
      TABLE_NAME: table.tableName,
      TIKTOK_SECRET_ARN: tiktokSecret.secretArn,
      MEDIA_BUCKET: mediaBucket.bucketName,
      MEDIA_BASE_URL: `${siteUrl}/media`,
      CLOUDFRONT_DISTRIBUTION_ID: distribution.distributionId,
      SITE_URL: siteUrl,
      NODE_OPTIONS: "--enable-source-maps",
      ...(props.sesFromEmail ? { SES_FROM_EMAIL: props.sesFromEmail } : {}),
      ...(props.sellerEmail ? { SELLER_NOTIFY_EMAIL: props.sellerEmail } : {}),
      ...(props.orderHoldHours ? { ORDER_HOLD_HOURS: props.orderHoldHours } : {}),
    };
    const worker = (id: string, entry: string, timeout: Duration, description: string) =>
      new nodejs.NodejsFunction(this, id, {
        description,
        entry: path.join(ROOT, entry),
        runtime: lambda.Runtime.NODEJS_24_X,
        architecture: lambda.Architecture.ARM_64,
        memorySize: 512,
        timeout,
        projectRoot: ROOT,
        depsLockFilePath: path.join(ROOT, "package-lock.json"),
        environment: workerEnv,
        bundling: {
          tsconfig: path.join(ROOT, "tsconfig.json"),
          minify: true,
          sourceMap: true,
          // The Node.js runtime ships AWS SDK v3.
          externalModules: ["@aws-sdk/*"],
        },
        logGroup: new logs.LogGroup(this, `${id}Logs`, { retention: logRetention, removalPolicy: RemovalPolicy.DESTROY }),
      });

    const eventsWorker = worker("EventsWorker", "src/workers/events.ts", Duration.minutes(1), "Order side effects and TikTok webhooks");
    eventsWorker.addEventSource(
      new eventSources.SqsEventSource(events, { batchSize: 5, reportBatchItemFailures: true, maxConcurrency: 5 }),
    );

    const syncWorker = worker("SyncWorker", "src/workers/sync.ts", Duration.minutes(5), "TikTok Shop token refresh and catalog sync");
    new scheduler.Schedule(this, "SyncSchedule", {
      description: "Reconcile catalog and inventory with TikTok Shop",
      schedule: scheduler.ScheduleExpression.rate(Duration.minutes(15)),
      target: new schedulerTargets.LambdaInvoke(syncWorker, { retryAttempts: 0 }),
    });

    for (const fn of [eventsWorker, syncWorker]) {
      table.grantReadWriteData(fn);
      tiktokSecret.grantRead(fn);
      tiktokSecret.grantWrite(fn); // token refresh, shop cipher, deauthorization
      mediaBucket.grantReadWrite(fn);
      distribution.grantCreateInvalidation(fn);
      if (props.sesFromEmail) {
        fn.addToRolePolicy(
          new iam.PolicyStatement({
            actions: ["ses:SendEmail"],
            resources: [`arn:${Aws.PARTITION}:ses:${Aws.REGION}:${Aws.ACCOUNT_ID}:identity/*`],
          }),
        );
      }
    }

    // ---------------------------------------------------------------- Alarms
    const alarms = new sns.Topic(this, "Alarms", { displayName: "Mall of Anitoy alarms" });
    if (props.alarmEmail) alarms.addSubscription(new subscriptions.EmailSubscription(props.alarmEmail));
    const alarm = (id: string, metric: cloudwatch.IMetric, threshold: number, description: string) =>
      new cloudwatch.Alarm(this, id, {
        metric,
        threshold,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: description,
      }).addAlarmAction(new cwActions.SnsAction(alarms));

    alarm(
      "DeadLettersAlarm",
      deadLetters.metricApproximateNumberOfMessagesVisible({ period: Duration.minutes(5), statistic: "Maximum" }),
      1,
      "Events failed repeatedly and were dead-lettered (orders may be missing TikTok inventory updates).",
    );
    alarm("StorefrontErrorsAlarm", storefront.metricErrors({ period: Duration.minutes(5) }), 5, "Storefront Lambda errors.");
    alarm("EventsWorkerErrorsAlarm", eventsWorker.metricErrors({ period: Duration.minutes(5) }), 3, "Events worker errors.");
    alarm("SyncErrorsAlarm", syncWorker.metricErrors({ period: Duration.hours(1) }), 2, "TikTok Shop sync is failing.");
    const paymentAnomalies = new logs.MetricFilter(this, "PaymentAnomalies", {
      logGroup: storefront.logGroup,
      filterPattern: logs.FilterPattern.any(
        logs.FilterPattern.stringValue("$.event", "=", "payment.amount_mismatch"),
        logs.FilterPattern.stringValue("$.event", "=", "payment.paid_after_cancel"),
      ),
      metricNamespace: "AnitoyMall",
      metricName: "PaymentAnomalies",
      metricValue: "1",
    });
    alarm(
      "PaymentAnomaliesAlarm",
      paymentAnomalies.metric({ period: Duration.minutes(5), statistic: "Sum" }),
      1,
      "A gateway payment did not match its order (wrong amount, or paid after the order timed out): refund or re-open it in /admin.",
    );
    const rateLimited = new logs.MetricFilter(this, "RateLimited", {
      logGroup: storefront.logGroup,
      filterPattern: logs.FilterPattern.stringValue("$.event", "=", "rate_limited"),
      metricNamespace: "AnitoyMall",
      metricName: "RateLimited",
      metricValue: "1",
    });
    alarm(
      "RateLimitedAlarm",
      rateLimited.metric({ period: Duration.minutes(5), statistic: "Sum" }),
      20,
      "Many checkout or order-lookup requests were rate limited: someone may be flooding the shop with orders. Check /admin for unwanted pending orders and cancel them.",
    );

    // ---------------------------------------------------------------- Outputs
    new CfnOutput(this, "SiteUrl", { value: siteUrl });
    new CfnOutput(this, "DistributionId", { value: distribution.distributionId });
    new CfnOutput(this, "TableName", { value: table.tableName });
    new CfnOutput(this, "MediaBucketName", { value: mediaBucket.bucketName });
    new CfnOutput(this, "TikTokWebhookUrl", {
      value: `${siteUrl}/api/webhooks/tiktok`,
      description: "Set as the webhook URL in TikTok Shop Partner Center",
    });
    new CfnOutput(this, "TikTokRedirectUrl", {
      value: `${siteUrl}/api/admin/tiktok/callback`,
      description: "Set as the OAuth redirect URL in TikTok Shop Partner Center",
    });
    new CfnOutput(this, "TikTokSecretArn", { value: tiktokSecret.secretArn });
    new CfnOutput(this, "PaymentsSecretArn", {
      value: paymentsSecret.secretArn,
      description: "Fill in gateway keys to enable ZaloPay / MoMo / card / ATM checkout",
    });
    new CfnOutput(this, "PaymentIpnUrls", {
      value: ["zalopay", "momo", "vnpay"].map((p) => `${siteUrl}/api/payments/${p}/ipn`).join(" "),
      description: "Server-to-server notification URLs to register with each gateway",
    });
    new CfnOutput(this, "AdminSecretArn", {
      value: adminSecret.secretArn,
      description: "aws secretsmanager get-secret-value --secret-id <arn> to read the admin password",
    });
  }
}

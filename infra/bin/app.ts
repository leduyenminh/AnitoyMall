import { App, Tags } from "aws-cdk-lib";
import { AnitoyMallStack } from "../lib/anitoy-stack.js";

// Configuration comes from CDK context (-c key=value or cdk.context.json) or environment variables:
//   domainName       custom domain, e.g. shop.anitoy.vn          (optional)
//   certificateArn   ACM certificate in us-east-1 for domainName (required with domainName)
//   alarmEmail       address subscribed to operational alarms     (optional)
//   sesFromEmail     verified SES sender for order emails         (optional)
//   sellerEmail      where new-order notifications go             (optional)
//   stage            name suffix, e.g. "prod" or "staging"        (default "prod")
//   orderHoldHours   hours an unconfirmed COD / bank-transfer order holds stock (default 24)
const app = new App();
const ctx = (key: string, envKey: string): string | undefined =>
  (app.node.tryGetContext(key) as string | undefined) ?? process.env[envKey] ?? undefined;

const stage = ctx("stage", "ANITOY_STAGE") ?? "prod";

const stack = new AnitoyMallStack(app, `AnitoyMall-${stage}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    // Singapore is the closest full-service region to Vietnam.
    region: process.env.CDK_DEFAULT_REGION ?? "ap-southeast-1",
  },
  description: "Mall of Anitoy storefront: Next.js on Lambda + CloudFront, DynamoDB, SQS, TikTok Shop sync",
  stage,
  domainName: ctx("domainName", "ANITOY_DOMAIN_NAME"),
  certificateArn: ctx("certificateArn", "ANITOY_CERTIFICATE_ARN"),
  alarmEmail: ctx("alarmEmail", "ANITOY_ALARM_EMAIL"),
  sesFromEmail: ctx("sesFromEmail", "ANITOY_SES_FROM_EMAIL"),
  sellerEmail: ctx("sellerEmail", "ANITOY_SELLER_EMAIL"),
  orderHoldHours: ctx("orderHoldHours", "ANITOY_ORDER_HOLD_HOURS"),
  // Public storefront settings baked into the browser bundle at build time.
  publicEnv: Object.fromEntries(
    Object.entries(process.env).filter(([key, value]) => key.startsWith("NEXT_PUBLIC_") && value),
  ) as Record<string, string>,
});

Tags.of(stack).add("app", "anitoy-mall");
Tags.of(stack).add("stage", stage);

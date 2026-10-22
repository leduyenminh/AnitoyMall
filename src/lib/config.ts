// Server-side runtime configuration. Never import this from client components.

export type DataBackend = "local" | "dynamodb";

const env = process.env;

export const config = {
  dataBackend: (env.DATA_BACKEND === "dynamodb" ? "dynamodb" : "local") as DataBackend,
  /** Directory for the local JSON store (development only). */
  localDataDir: env.LOCAL_DATA_DIR ?? ".data",
  aws: {
    region: env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? "ap-southeast-1",
    tableName: env.TABLE_NAME ?? "anitoy-mall",
    /** Point at DynamoDB Local for offline development. */
    dynamoEndpoint: env.DYNAMODB_ENDPOINT,
    eventsQueueUrl: env.EVENTS_QUEUE_URL,
    mediaBucket: env.MEDIA_BUCKET,
    mediaBaseUrl: env.MEDIA_BASE_URL?.replace(/\/$/, ""),
    distributionId: env.CLOUDFRONT_DISTRIBUTION_ID,
    tiktokSecretArn: env.TIKTOK_SECRET_ARN,
    adminSecretArn: env.ADMIN_SECRET_ARN,
    sesFromEmail: env.SES_FROM_EMAIL,
    sellerNotifyEmail: env.SELLER_NOTIFY_EMAIL,
  },
  orders: {
    /** Hours a COD or bank-transfer order holds stock before it is cancelled, unless the seller confirms it. */
    holdHours: Number(env.ORDER_HOLD_HOURS) > 0 ? Number(env.ORDER_HOLD_HOURS) : 24,
  },
  /** Shared secret CloudFront adds to every origin request; requests without it are rejected. */
  originVerifySecret: env.ORIGIN_VERIFY_SECRET,
  /** Local-development fallbacks; production reads these from Secrets Manager. */
  admin: {
    user: env.ADMIN_USER ?? "admin",
    password: env.ADMIN_PASSWORD,
  },
  tiktok: {
    appKey: env.TIKTOK_APP_KEY,
    appSecret: env.TIKTOK_APP_SECRET,
    serviceId: env.TIKTOK_SERVICE_ID,
    apiBase: env.TIKTOK_API_BASE ?? "https://open-api.tiktokglobalshop.com",
    authBase: env.TIKTOK_AUTH_BASE ?? "https://auth.tiktok-shops.com",
    authorizeBase: env.TIKTOK_AUTHORIZE_BASE ?? "https://services.tiktokshop.com",
    /** TikTok for Business Events API (server-side conversions). */
    eventsAccessToken: env.TIKTOK_EVENTS_ACCESS_TOKEN,
    /** TikTok for Developers app with Login Kit + Display API (video view counts). */
    displayClientKey: env.TIKTOK_DISPLAY_CLIENT_KEY,
    displayClientSecret: env.TIKTOK_DISPLAY_CLIENT_SECRET,
  },
};

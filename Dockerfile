# syntax=docker/dockerfile:1.7
#
# One image, two targets:
#   runner – plain Node.js server (docker compose, ECS/Fargate, App Runner, any container host)
#   lambda – the same server behind the AWS Lambda Web Adapter (used by the CDK stack)

ARG NODE_VERSION=24

# ---------- dependencies ----------
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- build ----------
FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Public storefront settings are inlined into the browser bundle at build time.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CURRENCY
ARG NEXT_PUBLIC_SHIPPING_FEE
ARG NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD
ARG NEXT_PUBLIC_DELIVERY_ETA
ARG NEXT_PUBLIC_TIKTOK_PRODUCT_URL_TEMPLATE
ARG NEXT_PUBLIC_TIKTOK_SHOP_URL
ARG NEXT_PUBLIC_TIKTOK_LIKES_LABEL
ARG NEXT_PUBLIC_TIKTOK_PIXEL_ID
ARG NEXT_PUBLIC_VIETQR_BANK_ID
ARG NEXT_PUBLIC_VIETQR_ACCOUNT_NO
ARG NEXT_PUBLIC_VIETQR_ACCOUNT_NAME
ARG NEXT_PUBLIC_CONTACT_PHONE
ARG NEXT_PUBLIC_CONTACT_EMAIL
ARG NEXT_PUBLIC_CONTACT_ZALO
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- runtime ----------
FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 exec node server.js"]

# ---------- AWS Lambda ----------
FROM runner AS lambda
USER root
# Lambda Web Adapter: translates Lambda invocations (incl. response streaming) to HTTP.
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter
ENV AWS_LWA_PORT=3000 \
    AWS_LWA_READINESS_CHECK_PATH=/api/health \
    AWS_LWA_INVOKE_MODE=response_stream
# Lambda's filesystem is read-only except /tmp: point Next's image cache there.
RUN rm -rf .next/cache && ln -s /tmp/next-cache .next/cache
CMD ["sh", "-c", "mkdir -p /tmp/next-cache && HOSTNAME=0.0.0.0 exec node server.js"]

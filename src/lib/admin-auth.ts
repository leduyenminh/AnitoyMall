import { timingSafeEqual } from "node:crypto";
import { config } from "./config";

// The seller back office (/admin, /api/admin/*) is protected with HTTP Basic authentication over
// HTTPS. On AWS the credentials are a generated Secrets Manager secret; locally they come from
// ADMIN_USER / ADMIN_PASSWORD. With no password configured, the back office is disabled.

interface AdminCredentials {
  username: string;
  password: string;
}

let cached: { value: AdminCredentials | null; at: number } | undefined;

async function credentials(): Promise<AdminCredentials | null> {
  if (cached && Date.now() - cached.at < 5 * 60_000) return cached.value;
  let value: AdminCredentials | null = null;
  if (config.aws.adminSecretArn) {
    const { SecretsManagerClient, GetSecretValueCommand } = await import("@aws-sdk/client-secrets-manager");
    const res = await new SecretsManagerClient({ region: config.aws.region }).send(
      new GetSecretValueCommand({ SecretId: config.aws.adminSecretArn }),
    );
    const parsed = JSON.parse(res.SecretString ?? "{}") as Partial<AdminCredentials>;
    if (parsed.username && parsed.password) value = { username: parsed.username, password: parsed.password };
  } else if (config.admin.password) {
    value = { username: config.admin.user, password: config.admin.password };
  }
  cached = { value, at: Date.now() };
  return value;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export type AdminCheck = "ok" | "unauthorized" | "disabled";

export async function checkAdmin(authorization: string | null): Promise<AdminCheck> {
  const expected = await credentials();
  if (!expected) return "disabled";
  if (!authorization?.startsWith("Basic ")) return "unauthorized";
  const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 0) return "unauthorized";
  const userOk = safeEqual(decoded.slice(0, separator), expected.username);
  const passOk = safeEqual(decoded.slice(separator + 1), expected.password);
  return userOk && passOk ? "ok" : "unauthorized";
}

import { config } from "@/lib/config";
import { json } from "@/lib/http";

/** Liveness probe for the Lambda Web Adapter / container orchestrators. */
export function GET() {
  return json({ ok: true, backend: config.dataBackend, time: new Date().toISOString() });
}

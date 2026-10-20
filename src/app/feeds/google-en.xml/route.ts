import { googleFeedResponse } from "../response";

// Google Merchant Center feed (English). See ../google.xml/route.ts.
export const revalidate = 120;

export function GET() {
  return googleFeedResponse("en");
}

import { googleFeedResponse } from "../response";

// Google Merchant Center feed (Vietnamese). Same freshness as the product pages, whose prices and
// stock Google checks the feed against.
export const revalidate = 120;

export function GET() {
  return googleFeedResponse("vi");
}

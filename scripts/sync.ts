// Run a TikTok Shop catalog sync from the command line (uses the same code as the sync Lambda).
//   npm run sync

async function main() {
  const { ensureFreshToken } = await import("../src/lib/tiktok/auth");
  const { syncCatalog } = await import("../src/lib/tiktok/sync");
  await ensureFreshToken(24 * 3600);
  console.log(await syncCatalog());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

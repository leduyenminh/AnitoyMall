// Run the TikTok sync (Shop catalog + video view counts) from the command line, using .env.local.
//   npm run sync

async function main() {
  const { syncAll } = await import("../src/lib/tiktok/sync");
  const result = await syncAll();
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

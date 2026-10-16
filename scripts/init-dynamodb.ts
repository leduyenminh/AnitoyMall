// Create the single-table schema in DynamoDB Local and load the sample catalog.
//
//   DYNAMODB_ENDPOINT=http://localhost:8000 npm run db:init
//
// Against real AWS the table is created by the CDK stack; pass --seed-only to load the sample
// catalog there (only for a demo: the products are placeholders until TikTok Shop is synced).

import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceNotFoundException,
  UpdateTimeToLiveCommand,
} from "@aws-sdk/client-dynamodb";

process.env.DATA_BACKEND = "dynamodb";
process.env.DYNAMODB_ENDPOINT ??= "http://localhost:8000";
if (process.env.DYNAMODB_ENDPOINT && !process.env.AWS_ACCESS_KEY_ID) {
  // DynamoDB Local accepts any credentials.
  process.env.AWS_ACCESS_KEY_ID = "local";
  process.env.AWS_SECRET_ACCESS_KEY = "local";
}

const seedOnly = process.argv.includes("--seed-only");

async function main() {
  const { config } = await import("../src/lib/config");
  const client = new DynamoDBClient({ region: config.aws.region, endpoint: config.aws.dynamoEndpoint });
  const TableName = config.aws.tableName;

  if (!seedOnly) {
    try {
      await client.send(new DescribeTableCommand({ TableName }));
      console.log(`Table ${TableName} already exists`);
    } catch (error) {
      if (!(error instanceof ResourceNotFoundException)) throw error;
      await client.send(
        new CreateTableCommand({
          TableName,
          BillingMode: "PAY_PER_REQUEST",
          AttributeDefinitions: ["PK", "SK", "GSI1PK", "GSI1SK"].map((name) => ({ AttributeName: name, AttributeType: "S" })),
          KeySchema: [
            { AttributeName: "PK", KeyType: "HASH" },
            { AttributeName: "SK", KeyType: "RANGE" },
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: "GSI1",
              KeySchema: [
                { AttributeName: "GSI1PK", KeyType: "HASH" },
                { AttributeName: "GSI1SK", KeyType: "RANGE" },
              ],
              Projection: { ProjectionType: "ALL" },
            },
          ],
        }),
      );
      await client.send(
        new UpdateTimeToLiveCommand({ TableName, TimeToLiveSpecification: { AttributeName: "expiresAt", Enabled: true } }),
      );
      console.log(`Created table ${TableName}`);
    }
  }

  const { seedProducts } = await import("../src/data/seed-products");
  const { getRepository } = await import("../src/lib/repo");
  const repo = await getRepository();
  for (const product of seedProducts) await repo.putProduct(product);
  console.log(`Loaded ${seedProducts.length} sample products`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

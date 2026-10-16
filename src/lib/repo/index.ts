import { config } from "../config";
import type { Repository } from "./types";

export * from "./types";

let instance: Promise<Repository> | undefined;

/** The configured data store: a local JSON file in development, DynamoDB on AWS. */
export function getRepository(): Promise<Repository> {
  instance ??=
    config.dataBackend === "dynamodb"
      ? import("./dynamo").then((m) => new m.DynamoRepository())
      : import("./local").then((m) => new m.LocalRepository());
  return instance;
}

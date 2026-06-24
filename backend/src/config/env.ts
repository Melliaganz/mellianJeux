import { config } from "dotenv";
import { existsSync } from "node:fs";

export const NODE_ENV = process.env.NODE_ENV ?? "development";
export const isProd = NODE_ENV === "production";

for (const file of [`.env.${NODE_ENV}`, ".env"]) {
  if (existsSync(file)) {
    config({ path: file, override: true });
    break;
  }
}

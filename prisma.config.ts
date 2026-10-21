import "dotenv/config";
import { defineConfig } from "prisma/config";
import { assertSeparateShadowDatabase } from "./prisma/database-urls";

const databaseUrl = process.env.DATABASE_URL ?? "";
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL?.trim() || undefined;
if (databaseUrl) assertSeparateShadowDatabase(databaseUrl, shadowDatabaseUrl);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
});

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";
import { getAuthConfig } from "./env";

const globalDatabase = globalThis as unknown as {
  studentFeedbackDb?: PrismaClient;
};

export function getDb(): PrismaClient {
  if (!globalDatabase.studentFeedbackDb) {
    const url = new URL(getAuthConfig().databaseUrl);
    if (url.protocol !== "mysql:")
      throw new Error("DATABASE_URL cần dùng MySQL.");
    const adapter = new PrismaMariaDb({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.slice(1)),
      connectionLimit: 5,
      connectTimeout: 5000,
      acquireTimeout: 10000,
    });
    globalDatabase.studentFeedbackDb = new PrismaClient({ adapter, log: [] });
  }
  return globalDatabase.studentFeedbackDb;
}

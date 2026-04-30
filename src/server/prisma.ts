import { PrismaClient } from "@/generated/prisma/client";
import type { SqlDriverAdapterFactory } from "@prisma/client/runtime/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let adapter: SqlDriverAdapterFactory;

if (process.env.TURSO_DATABASE_URL) {
  // Turso (libSQL) for production / Vercel
  const { PrismaLibSql } = await import("@prisma/adapter-libsql");
  adapter = new PrismaLibSql({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
} else {
  // Local SQLite for development
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  const path = await import("path");
  const dbPath = path.join(process.cwd(), "dev.db");
  adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

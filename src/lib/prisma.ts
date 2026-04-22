import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    // Return a proxy that throws on any query — pages catch this gracefully
    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        if (prop === "then") return undefined; // avoid thenable confusion
        return new Proxy(() => {}, {
          get: () => () => Promise.reject(new Error("DATABASE_URL not set")),
          apply: () => Promise.reject(new Error("DATABASE_URL not set")),
        });
      },
    });
  }
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

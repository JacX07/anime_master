import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL manquant (voir .env)");

// Réutilise le client entre les rechargements à chaud de Next.js en dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 5, connectionTimeoutMillis: 10_000 }) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

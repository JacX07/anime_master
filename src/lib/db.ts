import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL manquant (voir .env)");

// Réutilise le client entre les rechargements à chaud de Next.js en dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Chaque instance serverless garde jusqu'à `max` connexions vers le pooler Supabase (voir docs/deploiement.md §10).
// 2 par instance en production ; réglable par DB_POOL_MAX sans toucher au code.
const poolMax = Math.max(1, Number(process.env.DB_POOL_MAX) || (process.env.NODE_ENV === "production" ? 2 : 5));

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: url, max: poolMax, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 5_000 }),
    // Le défaut (5 s) est trop court quand Vercel et Supabase sont dans des régions éloignées :
    // une ouverture de lot enchaîne ~25 requêtes dans une même transaction.
    transactionOptions: { maxWait: 10_000, timeout: 30_000 },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

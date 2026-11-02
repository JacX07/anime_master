// Uniquement pour les anciennes bases SQLite ; ne génère pas le client applicatif.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/sqlite/schema.prisma",
  migrations: { path: "prisma/sqlite/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});

import { existsSync } from "node:fs";

// Vitest does not read .env automatically, and Prisma needs DATABASE_URL.
if (existsSync(".env")) {
  try {
    (process as unknown as { loadEnvFile?: (path: string) => void }).loadEnvFile?.(".env");
  } catch {
    // Ignore: the test will fail with a clear Prisma error if the env is missing.
  }
}
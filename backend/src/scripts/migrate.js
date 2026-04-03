import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../db/migrations");

async function run() {
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    await pool.query(sql);
    console.log(`Applied migration: ${file}`);
  }

  await pool.end();
}

run().catch((error) => {
  console.error("Migration failed", error);
  process.exitCode = 1;
});


import { pool } from "../db/index.js";
import { hashPassword } from "../lib/security.js";
import { findUserByEmail } from "../modules/users/repository.js";

const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
const adminName = process.env.SEED_ADMIN_NAME ?? "System Admin";

async function seedAdmin() {
  const existingUser = await findUserByEmail(adminEmail);

  if (existingUser) {
    console.log(`Admin already exists: ${adminEmail}`);
    return;
  }

  const passwordHash = await hashPassword(adminPassword);

  await pool.query(
    `
      INSERT INTO users (email, full_name, role, password_hash, is_active)
      VALUES ($1, $2, 'admin', $3, TRUE)
    `,
    [adminEmail, adminName, passwordHash]
  );

  console.log(`Admin created: ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
}

seedAdmin()
  .catch((error) => {
    console.error("Seed admin failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

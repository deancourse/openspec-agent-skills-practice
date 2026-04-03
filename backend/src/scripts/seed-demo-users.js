import { pool } from "../db/index.js";
import { hashPassword } from "../lib/security.js";
import { seedBalance } from "../modules/leave/service.js";

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "Demo123!";

const demoUsers = [
  {
    email: process.env.SEED_DEMO_ADMIN_EMAIL ?? "admin.demo@example.com",
    fullName: "Demo Admin",
    role: "admin",
    password: DEMO_PASSWORD
  },
  {
    email: "manager.alice@example.com",
    fullName: "Alice Manager",
    role: "manager",
    password: DEMO_PASSWORD
  },
  {
    email: "manager.bob@example.com",
    fullName: "Bob Manager",
    role: "manager",
    password: DEMO_PASSWORD
  },
  {
    email: "employee.emma@example.com",
    fullName: "Emma Employee",
    role: "employee",
    password: DEMO_PASSWORD,
    approverEmail: "manager.alice@example.com",
    delegateEmail: "manager.bob@example.com",
    annualBalanceHours: 80,
    compensatoryBalanceHours: 8
  },
  {
    email: "employee.noah@example.com",
    fullName: "Noah Employee",
    role: "employee",
    password: DEMO_PASSWORD,
    approverEmail: "manager.alice@example.com",
    delegateEmail: "manager.bob@example.com",
    annualBalanceHours: 40,
    compensatoryBalanceHours: 4
  },
  {
    email: "employee.olivia@example.com",
    fullName: "Olivia Employee",
    role: "employee",
    password: DEMO_PASSWORD,
    approverEmail: "manager.bob@example.com",
    delegateEmail: "manager.alice@example.com",
    annualBalanceHours: 96,
    compensatoryBalanceHours: 12
  }
];

async function upsertUser({ email, fullName, role, password }) {
  const passwordHash = await hashPassword(password);
  const result = await pool.query(
    `
      INSERT INTO users (email, full_name, role, password_hash, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT (email)
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        password_hash = EXCLUDED.password_hash,
        is_active = TRUE,
        updated_at = NOW()
      RETURNING id, email, full_name, role
    `,
    [email, fullName, role, passwordHash]
  );

  return result.rows[0];
}

async function connectUserRelations(usersByEmail) {
  for (const user of demoUsers) {
    const approverUserId = user.approverEmail
      ? usersByEmail.get(user.approverEmail)?.id ?? null
      : null;
    const delegateUserId = user.delegateEmail
      ? usersByEmail.get(user.delegateEmail)?.id ?? null
      : null;

    await pool.query(
      `
        UPDATE users
        SET
          approver_user_id = $2,
          delegate_user_id = $3,
          updated_at = NOW()
        WHERE id = $1
      `,
      [usersByEmail.get(user.email).id, approverUserId, delegateUserId]
    );
  }
}

async function seedBalances(usersByEmail) {
  for (const user of demoUsers) {
    if (user.role !== "employee") {
      continue;
    }

    const seededUser = usersByEmail.get(user.email);
    await seedBalance(seededUser.id, "annual", user.annualBalanceHours ?? 0);
    await seedBalance(
      seededUser.id,
      "compensatory",
      user.compensatoryBalanceHours ?? 0
    );
  }
}

async function seedDemoUsers() {
  const usersByEmail = new Map();

  for (const user of demoUsers) {
    const seededUser = await upsertUser(user);
    usersByEmail.set(user.email, seededUser);
  }

  await connectUserRelations(usersByEmail);
  await seedBalances(usersByEmail);

  console.log("Demo users are ready:");
  for (const user of demoUsers) {
    console.log(
      `- ${user.role.padEnd(8)} ${user.email} / ${user.password}`
    );
  }
}

seedDemoUsers()
  .catch((error) => {
    console.error("Seed demo users failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

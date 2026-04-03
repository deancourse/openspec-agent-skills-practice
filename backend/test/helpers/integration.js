import { once } from "node:events";
import { createApp } from "../../src/app.js";
import { pool } from "../../src/db/index.js";
import { hashPassword } from "../../src/lib/security.js";

export async function startTestServer() {
  const app = createApp();
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  };
}

export async function apiRequest(baseUrl, path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`
          }
        : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  return {
    status: response.status,
    data
  };
}

export async function seedUser({
  email,
  fullName,
  role = "employee",
  password = "Password123!",
  approverUserId = null,
  delegateUserId = null,
  isActive = true
}) {
  const passwordHash = await hashPassword(password);
  const result = await pool.query(
    `
      INSERT INTO users (
        email, full_name, role, password_hash, approver_user_id, delegate_user_id, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [email, fullName, role, passwordHash, approverUserId, delegateUserId, isActive]
  );

  return result.rows[0];
}

export async function seedLeaveBalance(userId, leaveType, balanceHours) {
  await pool.query(
    `
      INSERT INTO leave_balances (user_id, leave_type, balance_hours)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, leave_type)
      DO UPDATE SET balance_hours = EXCLUDED.balance_hours, updated_at = NOW()
    `,
    [userId, leaveType, balanceHours]
  );
}

export async function seedAttendanceRecord(userId, action, occurredAt, note = null) {
  const result = await pool.query(
    `
      INSERT INTO attendance_records (user_id, action, occurred_at, note)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [userId, action, occurredAt, note]
  );

  return result.rows[0];
}

export async function resetTestData() {
  async function resetAttendancePolicy() {
    try {
      await pool.query(
        `
          UPDATE attendance_policy
          SET
            work_start_time = '09:00',
            work_end_time = '18:00',
            grace_minutes = 0,
            missed_punch_submission_days = 3,
            missed_punch_requires_approval = TRUE,
            missed_punch_auto_approve_quota = 1,
            missed_punch_allow_admin_override = TRUE,
            updated_at = NOW()
          WHERE id = TRUE
        `
      );
    } catch (error) {
      if (error.code !== "42703") {
        throw error;
      }

      await pool.query(
        `
          UPDATE attendance_policy
          SET work_start_time = '09:00', work_end_time = '18:00', grace_minutes = 0, updated_at = NOW()
          WHERE id = TRUE
        `
      );
    }
  }

  const userResult = await pool.query(
    "SELECT id FROM users WHERE email LIKE 'test-%@example.com'"
  );
  const userIds = userResult.rows.map((row) => row.id);

  if (userIds.length === 0) {
    await resetAttendancePolicy();
    return;
  }

  const leaveResult = await pool.query(
    "SELECT id FROM leave_requests WHERE user_id = ANY($1::uuid[]) OR approver_user_id = ANY($1::uuid[])",
    [userIds]
  );
  const overtimeResult = await pool.query(
    "SELECT id FROM overtime_requests WHERE user_id = ANY($1::uuid[]) OR approver_user_id = ANY($1::uuid[])",
    [userIds]
  );
  const missedPunchResult = await pool.query(
    "SELECT id FROM missed_punch_requests WHERE user_id = ANY($1::uuid[]) OR approver_user_id = ANY($1::uuid[]) OR reviewer_user_id = ANY($1::uuid[])",
    [userIds]
  );

  const leaveIds = leaveResult.rows.map((row) => row.id);
  const overtimeIds = overtimeResult.rows.map((row) => row.id);
  const missedPunchIds = missedPunchResult.rows.map((row) => row.id);
  const requestIds = [...leaveIds, ...overtimeIds, ...missedPunchIds];

  if (requestIds.length > 0) {
    await pool.query(
      "DELETE FROM approvals WHERE request_id = ANY($1::uuid[])",
      [requestIds]
    );
  }

  await pool.query("DELETE FROM email_logs WHERE user_id = ANY($1::uuid[])", [userIds]);
  await pool.query("DELETE FROM setup_tokens WHERE user_id = ANY($1::uuid[])", [userIds]);
  await pool.query("DELETE FROM leave_balances WHERE user_id = ANY($1::uuid[])", [userIds]);
  await pool.query(
    "DELETE FROM missed_punch_requests WHERE user_id = ANY($1::uuid[]) OR approver_user_id = ANY($1::uuid[]) OR reviewer_user_id = ANY($1::uuid[])",
    [userIds]
  );
  await pool.query("DELETE FROM attendance_records WHERE user_id = ANY($1::uuid[])", [userIds]);
  await pool.query(
    "DELETE FROM leave_requests WHERE user_id = ANY($1::uuid[]) OR approver_user_id = ANY($1::uuid[])",
    [userIds]
  );
  await pool.query(
    "DELETE FROM overtime_requests WHERE user_id = ANY($1::uuid[]) OR approver_user_id = ANY($1::uuid[])",
    [userIds]
  );
  await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
  await resetAttendancePolicy();
}

export async function closeTestPool() {
  await pool.end();
}

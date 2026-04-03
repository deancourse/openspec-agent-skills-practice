import { query } from "../../db/index.js";

export async function listUsers() {
  const result = await query(
    `
      SELECT
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.is_active,
        u.approver_user_id,
        approver.full_name AS approver_name,
        u.delegate_user_id,
        delegate.full_name AS delegate_name,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN users approver ON approver.id = u.approver_user_id
      LEFT JOIN users delegate ON delegate.id = u.delegate_user_id
      ORDER BY u.created_at DESC
    `
  );

  return result.rows;
}

export async function findUserByEmail(email) {
  const result = await query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0] ?? null;
}

export async function findUserById(id) {
  const result = await query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function createUser({ email, fullName, role, approverUserId, delegateUserId }) {
  const result = await query(
    `
      INSERT INTO users (email, full_name, role, approver_user_id, delegate_user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [email, fullName, role, approverUserId, delegateUserId]
  );

  return result.rows[0];
}

export async function updateUser(id, updates) {
  const result = await query(
    `
      UPDATE users
      SET
        full_name = COALESCE($2, full_name),
        role = COALESCE($3, role),
        approver_user_id = COALESCE($4, approver_user_id),
        delegate_user_id = COALESCE($5, delegate_user_id),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      id,
      updates.fullName ?? null,
      updates.role ?? null,
      updates.approverUserId ?? null,
      updates.delegateUserId ?? null,
      updates.isActive ?? null
    ]
  );

  return result.rows[0] ?? null;
}

export async function setPasswordHash(userId, passwordHash) {
  await query(
    `
      UPDATE users
      SET password_hash = $2, updated_at = NOW()
      WHERE id = $1
    `,
    [userId, passwordHash]
  );
}


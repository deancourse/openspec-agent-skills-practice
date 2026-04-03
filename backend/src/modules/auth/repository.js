import { query } from "../../db/index.js";

export async function createSetupTokenRecord({ userId, tokenHash, expiresAt }) {
  const result = await query(
    `
      INSERT INTO setup_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [userId, tokenHash, expiresAt]
  );

  return result.rows[0];
}

export async function findValidSetupToken(tokenHash) {
  const result = await query(
    `
      SELECT *
      FROM setup_tokens
      WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [tokenHash]
  );

  return result.rows[0] ?? null;
}

export async function markSetupTokenUsed(id) {
  await query("UPDATE setup_tokens SET used_at = NOW() WHERE id = $1", [id]);
}


import { query, withTransaction } from "../../db/index.js";
import { hoursBetween } from "../../lib/date.js";
import { badRequest, forbidden, notFound } from "../../lib/errors.js";

async function assertManagerScope(requester, requestId) {
  if (requester.role === "admin") {
    const result = await query("SELECT * FROM overtime_requests WHERE id = $1", [requestId]);

    if (result.rowCount === 0) {
      throw notFound("Overtime request not found");
    }

    return result.rows[0];
  }

  const result = await query(
    "SELECT * FROM overtime_requests WHERE id = $1 AND approver_user_id = $2",
    [requestId, requester.sub]
  );

  if (result.rowCount === 0) {
    throw forbidden("Overtime request is not assigned to this approver");
  }

  return result.rows[0];
}

export async function submitOvertimeRequest(requester, payload) {
  const hoursRequested = hoursBetween(payload.startAt, payload.endAt);

  if (hoursRequested <= 0) {
    throw badRequest("Overtime range must be greater than zero hours");
  }

  const requesterResult = await query(
    "SELECT approver_user_id FROM users WHERE id = $1",
    [requester.sub]
  );

  const approverUserId =
    payload.approverUserId ?? requesterResult.rows[0]?.approver_user_id ?? null;

  if (!approverUserId) {
    throw badRequest("Approver user is required");
  }

  const result = await query(
    `
      INSERT INTO overtime_requests (
        user_id, approver_user_id, work_date, start_at, end_at, hours_requested, reason
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [
      requester.sub,
      approverUserId,
      payload.workDate,
      payload.startAt,
      payload.endAt,
      hoursRequested,
      payload.reason
    ]
  );

  return result.rows[0];
}

export async function listOvertimeRequests(requester) {
  let sql = "SELECT * FROM overtime_requests";
  const params = [];

  if (requester.role === "employee") {
    sql += " WHERE user_id = $1";
    params.push(requester.sub);
  } else if (requester.role === "manager") {
    sql += " WHERE approver_user_id = $1 OR user_id = $1";
    params.push(requester.sub);
  }

  sql += " ORDER BY created_at DESC";
  const result = await query(sql, params);
  return result.rows;
}

export async function decideOvertimeRequest(requester, requestId, action, comment) {
  if (!["approved", "rejected"].includes(action)) {
    throw badRequest("Invalid decision");
  }

  const overtimeRequest = await assertManagerScope(requester, requestId);

  if (overtimeRequest.status !== "pending") {
    throw badRequest("Only pending requests can be decided");
  }

  return withTransaction(async (client) => {
    const updated = await client.query(
      `
        UPDATE overtime_requests
        SET status = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [requestId, action]
    );

    await client.query(
      `
        INSERT INTO approvals (request_type, request_id, approver_user_id, action, comment)
        VALUES ('overtime', $1, $2, $3, $4)
      `,
      [requestId, requester.sub, action, comment ?? null]
    );

    return updated.rows[0];
  });
}

export async function listApprovedOvertime(userId) {
  const result = await query(
    `
      SELECT *
      FROM overtime_requests
      WHERE user_id = $1 AND status = 'approved'
      ORDER BY work_date DESC, created_at DESC
    `,
    [userId]
  );

  return result.rows;
}

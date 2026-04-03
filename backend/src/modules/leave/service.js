import { query, withTransaction } from "../../db/index.js";
import { hoursBetween } from "../../lib/date.js";
import { badRequest, forbidden, notFound } from "../../lib/errors.js";

function requiresBalance(type) {
  return type === "annual" || type === "compensatory";
}

async function assertManagerScope(requester, requestId) {
  if (requester.role === "admin") {
    const result = await query("SELECT * FROM leave_requests WHERE id = $1", [requestId]);

    if (result.rowCount === 0) {
      throw notFound("Leave request not found");
    }

    return result.rows[0];
  }

  const result = await query(
    "SELECT * FROM leave_requests WHERE id = $1 AND approver_user_id = $2",
    [requestId, requester.sub]
  );

  if (result.rowCount === 0) {
    throw forbidden("Leave request is not assigned to this approver");
  }

  return result.rows[0];
}

export async function listBalances(userId) {
  const result = await query(
    `
      SELECT leave_type, balance_hours
      FROM leave_balances
      WHERE user_id = $1
      ORDER BY leave_type
    `,
    [userId]
  );

  return result.rows;
}

export async function submitLeaveRequest(requester, payload) {
  const hoursRequested = hoursBetween(payload.startAt, payload.endAt);

  if (hoursRequested <= 0) {
    throw badRequest("Leave range must be greater than zero hours");
  }

  if (!payload.delegateUserId) {
    throw badRequest("Delegate user is required");
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

  if (requiresBalance(payload.leaveType)) {
    const balanceResult = await query(
      `
        SELECT balance_hours
        FROM leave_balances
        WHERE user_id = $1 AND leave_type = $2
      `,
      [requester.sub, payload.leaveType]
    );

    const balance = Number(balanceResult.rows[0]?.balance_hours ?? 0);

    if (hoursRequested > balance) {
      throw badRequest("Insufficient leave balance");
    }
  }

  const result = await query(
    `
      INSERT INTO leave_requests (
        user_id, approver_user_id, delegate_user_id, leave_type, start_at, end_at, hours_requested, reason
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [
      requester.sub,
      approverUserId,
      payload.delegateUserId,
      payload.leaveType,
      payload.startAt,
      payload.endAt,
      hoursRequested,
      payload.reason ?? null
    ]
  );

  return result.rows[0];
}

export async function listLeaveRequests(requester) {
  let sql = "SELECT * FROM leave_requests";
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

export async function decideLeaveRequest(requester, requestId, action, comment) {
  if (!["approved", "rejected"].includes(action)) {
    throw badRequest("Invalid decision");
  }

  const leaveRequest = await assertManagerScope(requester, requestId);

  if (leaveRequest.status !== "pending") {
    throw badRequest("Only pending requests can be decided");
  }

  return withTransaction(async (client) => {
    const updated = await client.query(
      `
        UPDATE leave_requests
        SET status = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [requestId, action]
    );

    await client.query(
      `
        INSERT INTO approvals (request_type, request_id, approver_user_id, action, comment)
        VALUES ('leave', $1, $2, $3, $4)
      `,
      [requestId, requester.sub, action, comment ?? null]
    );

    if (action === "approved" && requiresBalance(leaveRequest.leave_type)) {
      await client.query(
        `
          UPDATE leave_balances
          SET balance_hours = balance_hours - $3, updated_at = NOW()
          WHERE user_id = $1 AND leave_type = $2
        `,
        [leaveRequest.user_id, leaveRequest.leave_type, leaveRequest.hours_requested]
      );
    }

    return updated.rows[0];
  });
}

export async function seedBalance(userId, leaveType, balanceHours) {
  const result = await query(
    `
      INSERT INTO leave_balances (user_id, leave_type, balance_hours)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, leave_type)
      DO UPDATE SET balance_hours = EXCLUDED.balance_hours, updated_at = NOW()
      RETURNING *
    `,
    [userId, leaveType, balanceHours]
  );

  return result.rows[0];
}

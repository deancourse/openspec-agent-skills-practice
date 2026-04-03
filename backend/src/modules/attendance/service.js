import { query, withTransaction } from "../../db/index.js";
import { badRequest, forbidden, notFound } from "../../lib/errors.js";

const DEFAULT_POLICY = {
  work_start_time: "09:00:00",
  work_end_time: "18:00:00",
  grace_minutes: 0,
  missed_punch_submission_days: 3,
  missed_punch_requires_approval: true,
  missed_punch_auto_approve_quota: 1,
  missed_punch_allow_admin_override: true,
  updated_at: null
};

const BUSINESS_TIME_OFFSET_MINUTES = 8 * 60;
const BUSINESS_TIME_OFFSET_MS = BUSINESS_TIME_OFFSET_MINUTES * 60 * 1000;

function shiftToBusinessTime(value) {
  return new Date(new Date(value).getTime() + BUSINESS_TIME_OFFSET_MS);
}

function parseBusinessDateParts(value) {
  const shifted = shiftToBusinessTime(value);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate()
  };
}

function datePartsFromWorkDate(workDate) {
  const [year, month, day] = workDate.split("-").map(Number);
  return { year, month, day };
}

function buildDayRange(date = new Date()) {
  const workDate =
    typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : formatWorkDate(date);
  const { year, month, day } = datePartsFromWorkDate(workDate);
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - BUSINESS_TIME_OFFSET_MS);
  const end = new Date(
    Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0) - BUSINESS_TIME_OFFSET_MS - 1
  );

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function buildMonthRange(value = new Date()) {
  const shifted = shiftToBusinessTime(value);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0) - BUSINESS_TIME_OFFSET_MS);
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0) - BUSINESS_TIME_OFFSET_MS - 1);

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatWorkDate(value) {
  const { year, month, day } = parseBusinessDateParts(value);
  return `${year}-${pad(month)}-${pad(day)}`;
}

function isValidDecision(action) {
  return action === "approved" || action === "rejected";
}

function isValidMissingAction(action) {
  return action === "clock_in" || action === "clock_out";
}

function adjustmentKey(userId, workDate) {
  return `${userId}:${workDate}`;
}

async function getLatestAttendance(userId) {
  const result = await query(
    `
      SELECT *
      FROM attendance_records
      WHERE user_id = $1
      ORDER BY occurred_at DESC
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] ?? null;
}

async function getAttendanceSummaryForDate(userId, workDate, executor = { query }) {
  const { start, end } = buildDayRange(workDate);
  const result = await executor.query(
    `
      SELECT
        MIN(occurred_at) FILTER (WHERE action = 'clock_in') AS first_clock_in,
        MAX(occurred_at) FILTER (WHERE action = 'clock_out') AS last_clock_out,
        COUNT(*) FILTER (WHERE action = 'clock_in') AS clock_in_count,
        COUNT(*) FILTER (WHERE action = 'clock_out') AS clock_out_count
      FROM attendance_records
      WHERE user_id = $1
        AND occurred_at BETWEEN $2 AND $3
    `,
    [userId, start, end]
  );

  return result.rows[0];
}

function buildLateStatus(occurredAt, policy) {
  const occurred = shiftToBusinessTime(occurredAt);
  const [hours, minutes] = policy.work_start_time.split(":").map(Number);
  const expected = Date.UTC(
    occurred.getUTCFullYear(),
    occurred.getUTCMonth(),
    occurred.getUTCDate(),
    hours,
    minutes + Number(policy.grace_minutes ?? 0),
    0,
    0
  );

  if (occurred.getTime() <= expected) {
    return {
      isLate: false,
      minutesLate: 0,
      message: "已完成上班打卡，未超過規定上班時間。"
    };
  }

  const minutesLate = Math.floor((occurred.getTime() - expected) / 60000);

  return {
    isLate: true,
    minutesLate,
    message: `已完成上班打卡，本次遲到 ${minutesLate} 分鐘。`
  };
}

function buildLateSummary(firstClockIn, policy) {
  if (!firstClockIn) {
    return {
      isLate: false,
      minutesLate: 0,
      label: "未上班打卡"
    };
  }

  const lateStatus = buildLateStatus(firstClockIn, policy);

  return {
    isLate: lateStatus.isLate,
    minutesLate: lateStatus.minutesLate,
    label: lateStatus.isLate ? `遲到 ${lateStatus.minutesLate} 分鐘` : "正常"
  };
}

function normalizePolicy(row) {
  return {
    ...DEFAULT_POLICY,
    ...row,
    grace_minutes: Number(row?.grace_minutes ?? DEFAULT_POLICY.grace_minutes),
    missed_punch_submission_days: Number(
      row?.missed_punch_submission_days ?? DEFAULT_POLICY.missed_punch_submission_days
    ),
    missed_punch_auto_approve_quota: Number(
      row?.missed_punch_auto_approve_quota ?? DEFAULT_POLICY.missed_punch_auto_approve_quota
    ),
    missed_punch_requires_approval:
      row?.missed_punch_requires_approval ??
      DEFAULT_POLICY.missed_punch_requires_approval,
    missed_punch_allow_admin_override:
      row?.missed_punch_allow_admin_override ??
      DEFAULT_POLICY.missed_punch_allow_admin_override
  };
}

function mapAdjustmentRequest(row) {
  return {
    ...row,
    work_date: formatWorkDate(row.work_date),
    adjustment_status: row.status
  };
}

function buildAdjustmentStatusLabel(status) {
  if (status === "pending") {
    return "補登待審核";
  }

  if (status === "approved") {
    return "已套用補登";
  }

  if (status === "rejected") {
    return "補登已拒絕";
  }

  return "原始打卡";
}

async function listVisibleUsers(requester, targetUserId = null) {
  let sql = `
    SELECT id, full_name
    FROM users
  `;
  const params = [];

  if (requester.role === "employee") {
    sql += " WHERE id = $1";
    params.push(requester.sub);
  } else if (requester.role === "manager") {
    sql +=
      " WHERE id = $1 OR approver_user_id = $1";
    params.push(requester.sub);
  }

  if (targetUserId && requester.role !== "employee") {
    sql += params.length === 0 ? " WHERE id = $1" : " AND id = $2";
    params.push(targetUserId);
  }

  if (requester.role === "employee" && targetUserId && targetUserId !== requester.sub) {
    throw forbidden("一般員工只能查看自己的出勤紀錄。");
  }

  sql += " ORDER BY full_name ASC";
  const result = await query(sql, params);
  return result.rows;
}

async function listAdjustmentRowsForUsers(userIds, status = null) {
  if (userIds.length === 0) {
    return [];
  }

  let sql = `
    SELECT
      request.id,
      request.user_id,
      users.full_name AS user_name,
      request.approver_user_id,
      approver.full_name AS approver_name,
      request.reviewer_user_id,
      reviewer.full_name AS reviewer_name,
      request.work_date,
      request.missing_action,
      request.requested_time,
      request.reason,
      request.status,
      request.review_comment,
      request.auto_approved_by_policy,
      request.decided_at,
      request.created_at,
      request.updated_at
    FROM missed_punch_requests AS request
    INNER JOIN users ON users.id = request.user_id
    LEFT JOIN users AS approver ON approver.id = request.approver_user_id
    LEFT JOIN users AS reviewer ON reviewer.id = request.reviewer_user_id
    WHERE request.user_id = ANY($1::uuid[])
  `;
  const params = [userIds];

  if (status) {
    sql += " AND request.status = $2";
    params.push(status);
  }

  sql += " ORDER BY request.created_at DESC";
  const result = await query(sql, params);
  return result.rows.map(mapAdjustmentRequest);
}

async function getMissedPunchRequestById(requestId) {
  const result = await query(
    `
      SELECT *
      FROM missed_punch_requests
      WHERE id = $1
    `,
    [requestId]
  );

  return result.rows[0] ?? null;
}

async function assertDecisionScope(requester, requestId) {
  const request = await getMissedPunchRequestById(requestId);

  if (!request) {
    throw notFound("Missed punch request not found");
  }

  if (requester.role === "admin") {
    return request;
  }

  if (request.approver_user_id !== requester.sub) {
    throw forbidden("Missed punch request is not assigned to this approver");
  }

  return request;
}

async function countAutoApprovedThisMonth(userId, now = new Date(), executor = { query }) {
  const { start, end } = buildMonthRange(now);
  const result = await executor.query(
    `
      SELECT COUNT(*)::int AS total
      FROM missed_punch_requests
      WHERE user_id = $1
        AND auto_approved_by_policy = TRUE
        AND created_at BETWEEN $2 AND $3
    `,
    [userId, start, end]
  );

  return Number(result.rows[0]?.total ?? 0);
}

function canAutoApprove({ policy, summary, missingAction, autoApprovedCount }) {
  const isMissingRawBound =
    missingAction === "clock_in" ? !summary.first_clock_in : !summary.last_clock_out;

  if (!policy.missed_punch_requires_approval) {
    return true;
  }

  return (
    isMissingRawBound &&
    autoApprovedCount < Number(policy.missed_punch_auto_approve_quota ?? 0)
  );
}

function isWithinSubmissionWindow(workDate, submissionDays, now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const target = new Date(workDate);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000));
  return diffDays >= 0 && diffDays <= submissionDays;
}

function pickEarlierTime(currentValue, candidateValue) {
  if (!currentValue) {
    return candidateValue;
  }

  return new Date(candidateValue).getTime() < new Date(currentValue).getTime()
    ? candidateValue
    : currentValue;
}

function pickLaterTime(currentValue, candidateValue) {
  if (!currentValue) {
    return candidateValue;
  }

  return new Date(candidateValue).getTime() > new Date(currentValue).getTime()
    ? candidateValue
    : currentValue;
}

function applyAttendanceAdjustments(rows, adjustmentRows, policy) {
  const rowMap = new Map();

  for (const row of rows) {
    const normalizedWorkDate = formatWorkDate(row.work_date);

    rowMap.set(adjustmentKey(row.user_id, normalizedWorkDate), {
      ...row,
      work_date: normalizedWorkDate,
      raw_first_clock_in: row.first_clock_in,
      raw_last_clock_out: row.last_clock_out,
      effective_first_clock_in: row.first_clock_in,
      effective_last_clock_out: row.last_clock_out
    });
  }

  for (const request of adjustmentRows) {
    const key = adjustmentKey(request.user_id, formatWorkDate(request.work_date));
    const existing =
      rowMap.get(key) ??
      {
        user_id: request.user_id,
        user_name: request.user_name,
        work_date: formatWorkDate(request.work_date),
        first_clock_in: null,
        last_clock_out: null,
        clock_in_count: 0,
        clock_out_count: 0,
        raw_first_clock_in: null,
        raw_last_clock_out: null,
        effective_first_clock_in: null,
        effective_last_clock_out: null
      };

    const isApproved = request.status === "approved";
    const hasPending = request.status === "pending";

    if (isApproved && request.missing_action === "clock_in") {
      existing.effective_first_clock_in = pickEarlierTime(
        existing.effective_first_clock_in,
        request.requested_time
      );
    }

    if (isApproved && request.missing_action === "clock_out") {
      existing.effective_last_clock_out = pickLaterTime(
        existing.effective_last_clock_out,
        request.requested_time
      );
    }

    if (!existing.adjustment_requests) {
      existing.adjustment_requests = [];
    }

    existing.adjustment_requests.push(request);
    existing.has_pending_adjustment = Boolean(existing.has_pending_adjustment || hasPending);
    rowMap.set(key, existing);
  }

  return [...rowMap.values()]
    .map((row) => {
      const latestApproved = row.adjustment_requests?.find(
        (request) => request.status === "approved"
      );
      const latestPending = row.adjustment_requests?.find(
        (request) => request.status === "pending"
      );
      const latestRejected = row.adjustment_requests?.find(
        (request) => request.status === "rejected"
      );
      const adjustmentStatus = latestPending
        ? "pending"
        : latestApproved
          ? "approved"
          : latestRejected
            ? "rejected"
            : "none";

      return {
        ...row,
        first_clock_in: row.effective_first_clock_in,
        last_clock_out: row.effective_last_clock_out,
        adjustment_status: adjustmentStatus,
        adjustment_status_label: buildAdjustmentStatusLabel(adjustmentStatus),
        latest_adjustment_request:
          latestPending ?? latestApproved ?? latestRejected ?? null,
        late_summary: buildLateSummary(row.effective_first_clock_in, policy)
      };
    })
    .sort((a, b) => {
      if (a.work_date === b.work_date) {
        return String(a.user_name).localeCompare(String(b.user_name), "zh-Hant");
      }

      return String(b.work_date).localeCompare(String(a.work_date));
    });
}

export async function getAttendancePolicy() {
  const result = await query(
    `
      SELECT
        work_start_time,
        work_end_time,
        grace_minutes,
        missed_punch_submission_days,
        missed_punch_requires_approval,
        missed_punch_auto_approve_quota,
        missed_punch_allow_admin_override,
        updated_at
      FROM attendance_policy
      WHERE id = TRUE
    `
  );

  return normalizePolicy(result.rows[0] ?? DEFAULT_POLICY);
}

export async function updateAttendancePolicy({
  workStartTime,
  workEndTime,
  graceMinutes,
  missedPunchSubmissionDays,
  missedPunchRequiresApproval,
  missedPunchAutoApproveQuota,
  missedPunchAllowAdminOverride
}) {
  const result = await query(
    `
      UPDATE attendance_policy
      SET
        work_start_time = $1,
        work_end_time = $2,
        grace_minutes = $3,
        missed_punch_submission_days = $4,
        missed_punch_requires_approval = $5,
        missed_punch_auto_approve_quota = $6,
        missed_punch_allow_admin_override = $7,
        updated_at = NOW()
      WHERE id = TRUE
      RETURNING
        work_start_time,
        work_end_time,
        grace_minutes,
        missed_punch_submission_days,
        missed_punch_requires_approval,
        missed_punch_auto_approve_quota,
        missed_punch_allow_admin_override,
        updated_at
    `,
    [
      workStartTime,
      workEndTime,
      graceMinutes,
      missedPunchSubmissionDays,
      missedPunchRequiresApproval,
      missedPunchAutoApproveQuota,
      missedPunchAllowAdminOverride
    ]
  );

  return normalizePolicy(result.rows[0]);
}

export async function clockIn(userId, note = null) {
  const policy = await getAttendancePolicy();
  const todaySummary = await getAttendanceSummaryForDate(userId, new Date());
  const result = await query(
    `
      INSERT INTO attendance_records (user_id, action, note)
      VALUES ($1, 'clock_in', $2)
      RETURNING *
    `,
    [userId, note]
  );

  const record = result.rows[0];
  const isFirstClockInToday = !todaySummary.first_clock_in;
  const referenceClockIn = isFirstClockInToday
    ? record.occurred_at
    : todaySummary.first_clock_in;
  const lateStatus = buildLateStatus(referenceClockIn, policy);

  return {
    ...record,
    policy,
    lateStatus: {
      ...lateStatus,
      isFirstClockInToday,
      message: isFirstClockInToday
        ? lateStatus.message
        : `已記錄新的上班打卡，但今日出勤仍以上班第一筆 ${new Date(referenceClockIn).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false })} 為準。`
    }
  };
}

export async function clockOut(userId, note = null) {
  const latest = await getLatestAttendance(userId);
  const todaySummary = await getAttendanceSummaryForDate(userId, new Date());

  if (!latest || !todaySummary.first_clock_in) {
    throw badRequest("今日尚未完成上班打卡，無法進行下班打卡。");
  }

  const result = await query(
    `
      INSERT INTO attendance_records (user_id, action, note)
      VALUES ($1, 'clock_out', $2)
      RETURNING *
    `,
    [userId, note]
  );

  const record = result.rows[0];

  return {
    ...record,
    message: todaySummary.last_clock_out
      ? "已記錄新的下班打卡，今日出勤將以下班最後一筆為準。"
      : "已完成下班打卡，今日出勤將以下班最後一筆為準。"
  };
}

export async function listAttendance(requester, targetUserId = null) {
  const [policy, visibleUsers] = await Promise.all([
    getAttendancePolicy(),
    listVisibleUsers(requester, targetUserId)
  ]);
  const userIds = visibleUsers.map((user) => user.id);

  if (userIds.length === 0) {
    return [];
  }

  const attendanceResult = await query(
    `
      SELECT
        attendance.user_id,
        users.full_name AS user_name,
        DATE(attendance.occurred_at) AS work_date,
        MIN(attendance.occurred_at) FILTER (WHERE attendance.action = 'clock_in') AS first_clock_in,
        MAX(attendance.occurred_at) FILTER (WHERE attendance.action = 'clock_out') AS last_clock_out,
        COUNT(*) FILTER (WHERE attendance.action = 'clock_in') AS clock_in_count,
        COUNT(*) FILTER (WHERE attendance.action = 'clock_out') AS clock_out_count
      FROM attendance_records AS attendance
      INNER JOIN users ON users.id = attendance.user_id
      WHERE attendance.user_id = ANY($1::uuid[])
      GROUP BY attendance.user_id, users.full_name, DATE(attendance.occurred_at)
    `,
    [userIds]
  );

  const adjustments = await listAdjustmentRowsForUsers(userIds);
  return applyAttendanceAdjustments(attendanceResult.rows, adjustments, policy);
}

export async function listMissedPunchRequests(requester) {
  let sql = `
    SELECT
      request.id,
      request.user_id,
      users.full_name AS user_name,
      request.approver_user_id,
      approver.full_name AS approver_name,
      request.reviewer_user_id,
      reviewer.full_name AS reviewer_name,
      request.work_date,
      request.missing_action,
      request.requested_time,
      request.reason,
      request.status,
      request.review_comment,
      request.auto_approved_by_policy,
      request.decided_at,
      request.created_at,
      request.updated_at
    FROM missed_punch_requests AS request
    INNER JOIN users ON users.id = request.user_id
    LEFT JOIN users AS approver ON approver.id = request.approver_user_id
    LEFT JOIN users AS reviewer ON reviewer.id = request.reviewer_user_id
  `;
  const params = [];

  if (requester.role === "employee") {
    sql += " WHERE request.user_id = $1";
    params.push(requester.sub);
  } else if (requester.role === "manager") {
    sql += " WHERE request.user_id = $1 OR request.approver_user_id = $1";
    params.push(requester.sub);
  }

  sql += " ORDER BY request.created_at DESC";
  const result = await query(sql, params);
  return result.rows.map(mapAdjustmentRequest);
}

export async function submitMissedPunchRequest(requester, payload) {
  if (!isValidMissingAction(payload.missingAction)) {
    throw badRequest("Missing action must be clock_in or clock_out");
  }

  if (!payload.workDate) {
    throw badRequest("Work date is required");
  }

  if (!payload.requestedTime) {
    throw badRequest("Requested time is required");
  }

  if (!payload.reason?.trim()) {
    throw badRequest("Reason is required");
  }

  const workDate = formatWorkDate(payload.workDate);
  const requestedTime = new Date(payload.requestedTime);

  if (Number.isNaN(requestedTime.getTime())) {
    throw badRequest("Requested time is invalid");
  }

  if (formatWorkDate(requestedTime) !== workDate) {
    throw badRequest("Requested time must match the selected work date");
  }

  const [policy, requesterResult] = await Promise.all([
    getAttendancePolicy(),
    query(
      `
        SELECT id, approver_user_id
        FROM users
        WHERE id = $1
      `,
      [requester.sub]
    )
  ]);
  const user = requesterResult.rows[0];

  if (!user) {
    throw notFound("User not found");
  }

  if (
    !isWithinSubmissionWindow(workDate, policy.missed_punch_submission_days) &&
    !(requester.role === "admin" && policy.missed_punch_allow_admin_override)
  ) {
    throw badRequest("已超過忘打卡補登期限。");
  }

  return withTransaction(async (client) => {
    const duplicateResult = await client.query(
      `
        SELECT id
        FROM missed_punch_requests
        WHERE user_id = $1
          AND work_date = $2
          AND missing_action = $3
          AND status = 'pending'
        LIMIT 1
      `,
      [requester.sub, workDate, payload.missingAction]
    );

    if (duplicateResult.rowCount > 0) {
      throw badRequest("同一天同類型的忘打卡補登申請仍在待審核中。");
    }

    const summary = await getAttendanceSummaryForDate(requester.sub, workDate, client);
    const autoApprovedCount = await countAutoApprovedThisMonth(requester.sub, new Date(), client);
    const autoApprove = canAutoApprove({
      policy,
      summary,
      missingAction: payload.missingAction,
      autoApprovedCount
    });
    const status = autoApprove ? "approved" : "pending";

    const inserted = await client.query(
      `
        INSERT INTO missed_punch_requests (
          user_id,
          approver_user_id,
          reviewer_user_id,
          work_date,
          missing_action,
          requested_time,
          reason,
          status,
          auto_approved_by_policy,
          decided_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
      [
        requester.sub,
        user.approver_user_id,
        autoApprove ? user.approver_user_id ?? null : null,
        workDate,
        payload.missingAction,
        requestedTime.toISOString(),
        payload.reason.trim(),
        status,
        autoApprove,
        autoApprove ? new Date().toISOString() : null
      ]
    );

    if (autoApprove) {
      await client.query(
        `
          INSERT INTO approvals (request_type, request_id, approver_user_id, action, comment)
          VALUES ('missed_punch', $1, $2, 'approved', $3)
        `,
        [
          inserted.rows[0].id,
          user.approver_user_id ?? requester.sub,
          "Auto-approved by missed punch policy"
        ]
      );
    }

    return mapAdjustmentRequest(inserted.rows[0]);
  });
}

export async function decideMissedPunchRequest(requester, requestId, action, comment) {
  if (!isValidDecision(action)) {
    throw badRequest("Invalid decision");
  }

  const request = await assertDecisionScope(requester, requestId);

  if (request.status !== "pending") {
    throw badRequest("Only pending requests can be decided");
  }

  if (action === "rejected" && !comment?.trim()) {
    throw badRequest("Rejecting a missed punch request requires a comment");
  }

  return withTransaction(async (client) => {
    const updated = await client.query(
      `
        UPDATE missed_punch_requests
        SET
          status = $2,
          reviewer_user_id = $3,
          review_comment = $4,
          decided_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [requestId, action, requester.sub, comment?.trim() ?? null]
    );

    await client.query(
      `
        INSERT INTO approvals (request_type, request_id, approver_user_id, action, comment)
        VALUES ('missed_punch', $1, $2, $3, $4)
      `,
      [requestId, requester.sub, action, comment?.trim() ?? null]
    );

    return mapAdjustmentRequest(updated.rows[0]);
  });
}

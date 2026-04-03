import { query } from "../../db/index.js";
import { badRequest, forbidden } from "../../lib/errors.js";

function buildDayRange(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
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

async function getTodayAttendanceSummary(userId, now = new Date()) {
  const { start, end } = buildDayRange(now);
  const result = await query(
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

export async function getAttendancePolicy() {
  const result = await query(
    `
      SELECT work_start_time, work_end_time, grace_minutes, updated_at
      FROM attendance_policy
      WHERE id = TRUE
    `
  );

  return (
    result.rows[0] ?? {
      work_start_time: "09:00:00",
      work_end_time: "18:00:00",
      grace_minutes: 0,
      updated_at: null
    }
  );
}

export async function updateAttendancePolicy({ workStartTime, workEndTime, graceMinutes }) {
  const result = await query(
    `
      UPDATE attendance_policy
      SET
        work_start_time = $1,
        work_end_time = $2,
        grace_minutes = $3,
        updated_at = NOW()
      WHERE id = TRUE
      RETURNING work_start_time, work_end_time, grace_minutes, updated_at
    `,
    [workStartTime, workEndTime, graceMinutes]
  );

  return result.rows[0];
}

function buildLateStatus(occurredAt, policy) {
  const occurred = new Date(occurredAt);
  const [hours, minutes] = policy.work_start_time.split(":").map(Number);
  const expected = new Date(occurred);
  expected.setHours(hours, minutes + Number(policy.grace_minutes ?? 0), 0, 0);

  if (occurred.getTime() <= expected.getTime()) {
    return {
      isLate: false,
      minutesLate: 0,
      message: "已完成上班打卡，未超過規定上班時間。"
    };
  }

  const minutesLate = Math.floor((occurred.getTime() - expected.getTime()) / 60000);

  return {
    isLate: true,
    minutesLate,
    message: `已完成上班打卡，本次遲到 ${minutesLate} 分鐘。`
  };
}

export async function clockIn(userId, note = null) {
  const policy = await getAttendancePolicy();
  const todaySummary = await getTodayAttendanceSummary(userId);
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
  const todaySummary = await getTodayAttendanceSummary(userId);

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
  const policy = await getAttendancePolicy();
  let whereClause = "WHERE attendance.user_id = $1";
  let params = [requester.sub];

  if (requester.role === "manager") {
    whereClause =
      "WHERE attendance.user_id = $1 OR attendance.user_id IN (SELECT id FROM users WHERE approver_user_id = $1)";
  }

  if (requester.role === "admin") {
    whereClause = "";
    params = [];
  }

  if (targetUserId && requester.role !== "employee") {
    whereClause += whereClause ? " AND attendance.user_id = $2" : "WHERE attendance.user_id = $1";
    params = requester.role === "admin" ? [targetUserId] : [requester.sub, targetUserId];
  }

  if (requester.role === "employee" && targetUserId && targetUserId !== requester.sub) {
    throw forbidden("一般員工只能查看自己的出勤紀錄。");
  }

  const result = await query(
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
      ${whereClause}
      GROUP BY attendance.user_id, users.full_name, DATE(attendance.occurred_at)
      ORDER BY work_date DESC, user_name ASC
    `,
    params
  );

  return result.rows.map((row) => ({
    ...row,
    late_summary: buildLateSummary(row.first_clock_in, policy)
  }));
}

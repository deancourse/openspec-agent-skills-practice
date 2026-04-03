import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import {
  apiRequest,
  closeTestPool,
  resetTestData,
  seedAttendanceRecord,
  seedLeaveBalance,
  seedUser,
  startTestServer
} from "./helpers/integration.js";

let server;

before(async () => {
  server = await startTestServer();
});

beforeEach(async () => {
  await resetTestData();
});

after(async () => {
  await resetTestData();
  await server.close();
  await closeTestPool();
});

test("auth login works and employee is blocked from admin-only endpoint", async () => {
  const adminPassword = "Password123!";
  const employeePassword = "Password123!";

  await seedUser({
    email: "test-admin-auth@example.com",
    fullName: "Test Admin",
    role: "admin",
    password: adminPassword
  });
  await seedUser({
    email: "test-employee-auth@example.com",
    fullName: "Test Employee",
    role: "employee",
    password: employeePassword
  });

  const adminLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-admin-auth@example.com",
      password: adminPassword
    }
  });

  assert.equal(adminLogin.status, 200);
  assert.equal(adminLogin.data.user.role, "admin");

  const employeeLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-employee-auth@example.com",
      password: employeePassword
    }
  });

  const usersResponse = await apiRequest(server.baseUrl, "/api/users", {
    token: employeeLogin.data.token
  });

  assert.equal(usersResponse.status, 403);
  assert.equal(usersResponse.data.error, "Insufficient permissions");
});

test("attendance policy drives late clock-in feedback and daily first-in last-out behavior", async () => {
  const admin = await seedUser({
    email: "test-admin-attendance@example.com",
    fullName: "Attendance Admin",
    role: "admin"
  });
  await seedUser({
    email: "test-employee-attendance@example.com",
    fullName: "Attendance Employee",
    role: "employee",
    approverUserId: admin.id
  });

  const adminLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-admin-attendance@example.com",
      password: "Password123!"
    }
  });
  const employeeLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-employee-attendance@example.com",
      password: "Password123!"
    }
  });

  const now = new Date();
  const lateStart = new Date(now.getTime() - 10 * 60 * 1000);
  const hh = String(lateStart.getHours()).padStart(2, "0");
  const mm = String(lateStart.getMinutes()).padStart(2, "0");

  const policyResponse = await apiRequest(server.baseUrl, "/api/attendance/policy", {
    method: "PATCH",
    token: adminLogin.data.token,
    body: {
      workStartTime: `${hh}:${mm}`,
      workEndTime: "18:00",
      graceMinutes: 0
    }
  });

  assert.equal(policyResponse.status, 200);

  const clockInResponse = await apiRequest(server.baseUrl, "/api/attendance/clock-in", {
    method: "POST",
    token: employeeLogin.data.token,
    body: {}
  });

  assert.equal(clockInResponse.status, 201);
  assert.equal(clockInResponse.data.lateStatus.isLate, true);
  assert.match(clockInResponse.data.lateStatus.message, /遲到/);

  const secondClockIn = await apiRequest(server.baseUrl, "/api/attendance/clock-in", {
    method: "POST",
    token: employeeLogin.data.token,
    body: {}
  });

  assert.equal(secondClockIn.status, 201);
  assert.equal(secondClockIn.data.lateStatus.isFirstClockInToday, false);
  assert.match(secondClockIn.data.lateStatus.message, /第一筆/);

  const firstClockOut = await apiRequest(server.baseUrl, "/api/attendance/clock-out", {
    method: "POST",
    token: employeeLogin.data.token,
    body: {}
  });

  assert.equal(firstClockOut.status, 201);
  assert.match(firstClockOut.data.message, /最後一筆/);

  const secondClockOut = await apiRequest(server.baseUrl, "/api/attendance/clock-out", {
    method: "POST",
    token: employeeLogin.data.token,
    body: {}
  });

  assert.equal(secondClockOut.status, 201);
  assert.match(secondClockOut.data.message, /最後一筆/);
});

test("clock-out is rejected when there is no same-day clock-in", async () => {
  await seedUser({
    email: "test-employee-no-clockin@example.com",
    fullName: "No ClockIn Employee",
    role: "employee"
  });

  const employeeLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-employee-no-clockin@example.com",
      password: "Password123!"
    }
  });

  const clockOut = await apiRequest(server.baseUrl, "/api/attendance/clock-out", {
    method: "POST",
    token: employeeLogin.data.token,
    body: {}
  });

  assert.equal(clockOut.status, 400);
  assert.equal(clockOut.data.error, "今日尚未完成上班打卡，無法進行下班打卡。");
});

test("attendance list returns daily summary rows with user name and first-in last-out values", async () => {
  const manager = await seedUser({
    email: "test-manager-summary@example.com",
    fullName: "Summary Manager",
    role: "manager"
  });
  await seedUser({
    email: "test-employee-summary@example.com",
    fullName: "Summary Employee",
    role: "employee",
    approverUserId: manager.id
  });

  const employeeLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-employee-summary@example.com",
      password: "Password123!"
    }
  });

  await apiRequest(server.baseUrl, "/api/attendance/clock-in", {
    method: "POST",
    token: employeeLogin.data.token,
    body: {}
  });
  await apiRequest(server.baseUrl, "/api/attendance/clock-in", {
    method: "POST",
    token: employeeLogin.data.token,
    body: {}
  });
  await apiRequest(server.baseUrl, "/api/attendance/clock-out", {
    method: "POST",
    token: employeeLogin.data.token,
    body: {}
  });

  const attendanceList = await apiRequest(server.baseUrl, "/api/attendance", {
    token: employeeLogin.data.token
  });

  assert.equal(attendanceList.status, 200);
  assert.equal(attendanceList.data.length, 1);
  assert.equal(attendanceList.data[0].user_name, "Summary Employee");
  assert.ok(attendanceList.data[0].first_clock_in);
  assert.ok(attendanceList.data[0].last_clock_out);
});

test("missed punch request can auto-approve and update effective attendance summary", async () => {
  await seedUser({
    email: "test-admin-missed-auto@example.com",
    fullName: "Missed Punch Admin",
    role: "admin"
  });
  const employee = await seedUser({
    email: "test-employee-missed-auto@example.com",
    fullName: "Missed Punch Auto",
    role: "employee"
  });

  const adminLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-admin-missed-auto@example.com",
      password: "Password123!"
    }
  });
  const employeeLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-employee-missed-auto@example.com",
      password: "Password123!"
    }
  });

  await apiRequest(server.baseUrl, "/api/attendance/policy", {
    method: "PATCH",
    token: adminLogin.data.token,
    body: {
      workStartTime: "09:00",
      workEndTime: "18:00",
      graceMinutes: 0,
      missedPunchSubmissionDays: 3,
      missedPunchRequiresApproval: true,
      missedPunchAutoApproveQuota: 1,
      missedPunchAllowAdminOverride: true
    }
  });

  await seedAttendanceRecord(employee.id, "clock_in", "2026-04-02T01:05:00.000Z");

  const request = await apiRequest(server.baseUrl, "/api/attendance/adjustments", {
    method: "POST",
    token: employeeLogin.data.token,
    body: {
      workDate: "2026-04-02",
      missingAction: "clock_out",
      requestedTime: "2026-04-02T09:00:00.000Z",
      reason: "忘記下班打卡"
    }
  });

  assert.equal(request.status, 201);
  assert.equal(request.data.status, "approved");
  assert.equal(request.data.auto_approved_by_policy, true);

  const attendanceList = await apiRequest(server.baseUrl, "/api/attendance", {
    token: employeeLogin.data.token
  });

  assert.equal(attendanceList.status, 200);
  assert.equal(attendanceList.data[0].adjustment_status, "approved");
  assert.equal(attendanceList.data[0].last_clock_out, "2026-04-02T09:00:00.000Z");
});

test("approved missed punch clock-out becomes the effective latest time", async () => {
  await seedUser({
    email: "test-admin-missed-latest@example.com",
    fullName: "Missed Punch Latest Admin",
    role: "admin"
  });
  const employee = await seedUser({
    email: "test-employee-missed-latest@example.com",
    fullName: "Missed Punch Latest Employee",
    role: "employee"
  });

  const adminLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-admin-missed-latest@example.com",
      password: "Password123!"
    }
  });
  const employeeLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-employee-missed-latest@example.com",
      password: "Password123!"
    }
  });

  await apiRequest(server.baseUrl, "/api/attendance/policy", {
    method: "PATCH",
    token: adminLogin.data.token,
    body: {
      workStartTime: "09:00",
      workEndTime: "18:00",
      graceMinutes: 0,
      missedPunchSubmissionDays: 3,
      missedPunchRequiresApproval: false,
      missedPunchAutoApproveQuota: 0,
      missedPunchAllowAdminOverride: true
    }
  });

  await seedAttendanceRecord(employee.id, "clock_in", "2026-04-02T01:00:00.000Z");
  await seedAttendanceRecord(employee.id, "clock_out", "2026-04-02T08:00:00.000Z");

  const request = await apiRequest(server.baseUrl, "/api/attendance/adjustments", {
    method: "POST",
    token: employeeLogin.data.token,
    body: {
      workDate: "2026-04-02",
      missingAction: "clock_out",
      requestedTime: "2026-04-02T09:30:00.000Z",
      reason: "補登更晚的下班時間"
    }
  });

  assert.equal(request.status, 201);
  assert.equal(request.data.status, "approved");

  const attendanceList = await apiRequest(server.baseUrl, "/api/attendance", {
    token: employeeLogin.data.token
  });

  assert.equal(attendanceList.status, 200);
  assert.equal(attendanceList.data[0].last_clock_out, "2026-04-02T09:30:00.000Z");
});

test("expired missed punch request is rejected by policy", async () => {
  await seedUser({
    email: "test-admin-missed-expired@example.com",
    fullName: "Missed Punch Policy Admin",
    role: "admin"
  });
  await seedUser({
    email: "test-employee-missed-expired@example.com",
    fullName: "Missed Punch Expired",
    role: "employee"
  });

  const adminLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-admin-missed-expired@example.com",
      password: "Password123!"
    }
  });
  const employeeLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-employee-missed-expired@example.com",
      password: "Password123!"
    }
  });

  await apiRequest(server.baseUrl, "/api/attendance/policy", {
    method: "PATCH",
    token: adminLogin.data.token,
    body: {
      workStartTime: "09:00",
      workEndTime: "18:00",
      graceMinutes: 0,
      missedPunchSubmissionDays: 1,
      missedPunchRequiresApproval: true,
      missedPunchAutoApproveQuota: 0,
      missedPunchAllowAdminOverride: true
    }
  });

  const request = await apiRequest(server.baseUrl, "/api/attendance/adjustments", {
    method: "POST",
    token: employeeLogin.data.token,
    body: {
      workDate: "2026-03-20",
      missingAction: "clock_in",
      requestedTime: "2026-03-20T01:00:00.000Z",
      reason: "補登太晚"
    }
  });

  assert.equal(request.status, 400);
  assert.equal(request.data.error, "已超過忘打卡補登期限。");
});

test("manager can review pending missed punch request and pending request does not change summary before approval", async () => {
  await seedUser({
    email: "test-admin-missed-review@example.com",
    fullName: "Missed Punch Review Admin",
    role: "admin"
  });
  const manager = await seedUser({
    email: "test-manager-missed-review@example.com",
    fullName: "Missed Punch Manager",
    role: "manager"
  });
  const employee = await seedUser({
    email: "test-employee-missed-review@example.com",
    fullName: "Missed Punch Employee",
    role: "employee",
    approverUserId: manager.id
  });

  const adminLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-admin-missed-review@example.com",
      password: "Password123!"
    }
  });
  const managerLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-manager-missed-review@example.com",
      password: "Password123!"
    }
  });
  const employeeLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-employee-missed-review@example.com",
      password: "Password123!"
    }
  });

  await apiRequest(server.baseUrl, "/api/attendance/policy", {
    method: "PATCH",
    token: adminLogin.data.token,
    body: {
      workStartTime: "09:00",
      workEndTime: "18:00",
      graceMinutes: 0,
      missedPunchSubmissionDays: 3,
      missedPunchRequiresApproval: true,
      missedPunchAutoApproveQuota: 0,
      missedPunchAllowAdminOverride: true
    }
  });

  await seedAttendanceRecord(employee.id, "clock_out", "2026-04-02T09:00:00.000Z");

  const request = await apiRequest(server.baseUrl, "/api/attendance/adjustments", {
    method: "POST",
    token: employeeLogin.data.token,
    body: {
      workDate: "2026-04-02",
      missingAction: "clock_in",
      requestedTime: "2026-04-02T01:20:00.000Z",
      reason: "忘記上班打卡"
    }
  });

  assert.equal(request.status, 201);
  assert.equal(request.data.status, "pending");

  const pendingSummary = await apiRequest(server.baseUrl, "/api/attendance", {
    token: employeeLogin.data.token
  });

  assert.equal(pendingSummary.data[0].adjustment_status, "pending");
  assert.equal(pendingSummary.data[0].first_clock_in, null);

  const decision = await apiRequest(
    server.baseUrl,
    `/api/attendance/adjustments/${request.data.id}/decision`,
    {
      method: "POST",
      token: managerLogin.data.token,
      body: {
        action: "approved",
        comment: "補登合理"
      }
    }
  );

  assert.equal(decision.status, 200);
  assert.equal(decision.data.status, "approved");

  const approvedSummary = await apiRequest(server.baseUrl, "/api/attendance", {
    token: employeeLogin.data.token
  });

  assert.equal(approvedSummary.data[0].adjustment_status, "approved");
  assert.equal(approvedSummary.data[0].first_clock_in, "2026-04-02T01:20:00.000Z");
});

test("early morning missed punch keeps the selected local work date", async () => {
  await seedUser({
    email: "test-admin-missed-timezone@example.com",
    fullName: "Missed Punch Timezone Admin",
    role: "admin"
  });
  const employee = await seedUser({
    email: "test-employee-missed-timezone@example.com",
    fullName: "Missed Punch Timezone Employee",
    role: "employee"
  });

  const adminLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-admin-missed-timezone@example.com",
      password: "Password123!"
    }
  });
  const employeeLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-employee-missed-timezone@example.com",
      password: "Password123!"
    }
  });

  await apiRequest(server.baseUrl, "/api/attendance/policy", {
    method: "PATCH",
    token: adminLogin.data.token,
    body: {
      workStartTime: "09:00",
      workEndTime: "18:00",
      graceMinutes: 0,
      missedPunchSubmissionDays: 3,
      missedPunchRequiresApproval: true,
      missedPunchAutoApproveQuota: 1,
      missedPunchAllowAdminOverride: true
    }
  });

  await seedAttendanceRecord(employee.id, "clock_out", "2026-04-02T10:00:00.000Z");

  const request = await apiRequest(server.baseUrl, "/api/attendance/adjustments", {
    method: "POST",
    token: employeeLogin.data.token,
    body: {
      workDate: "2026-04-02",
      missingAction: "clock_in",
      requestedTime: "2026-04-01T16:30:00.000Z",
      reason: "補登凌晨時段"
    }
  });

  assert.equal(request.status, 201);
  assert.equal(String(request.data.work_date).slice(0, 10), "2026-04-02");

  const attendanceList = await apiRequest(server.baseUrl, "/api/attendance", {
    token: employeeLogin.data.token
  });

  assert.equal(attendanceList.status, 200);
  assert.equal(attendanceList.data[0].work_date, "2026-04-02");
  assert.equal(attendanceList.data[0].first_clock_in, "2026-04-01T16:30:00.000Z");
});

test("leave workflow rejects insufficient balance and approved leave reduces balance", async () => {
  const manager = await seedUser({
    email: "test-manager-leave@example.com",
    fullName: "Leave Manager",
    role: "manager"
  });
  const employee = await seedUser({
    email: "test-employee-leave@example.com",
    fullName: "Leave Employee",
    role: "employee",
    approverUserId: manager.id,
    delegateUserId: manager.id
  });

  await seedLeaveBalance(employee.id, "annual", 4);

  const employeeLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-employee-leave@example.com",
      password: "Password123!"
    }
  });
  const managerLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-manager-leave@example.com",
      password: "Password123!"
    }
  });

  const insufficientRequest = await apiRequest(server.baseUrl, "/api/leave/requests", {
    method: "POST",
    token: employeeLogin.data.token,
    body: {
      leaveType: "annual",
      startAt: "2026-04-04T01:00:00.000Z",
      endAt: "2026-04-04T09:00:00.000Z",
      reason: "Test leave",
      delegateUserId: manager.id
    }
  });

  assert.equal(insufficientRequest.status, 400);
  assert.equal(insufficientRequest.data.error, "Insufficient leave balance");

  const validRequest = await apiRequest(server.baseUrl, "/api/leave/requests", {
    method: "POST",
    token: employeeLogin.data.token,
    body: {
      leaveType: "annual",
      startAt: "2026-04-04T01:00:00.000Z",
      endAt: "2026-04-04T03:00:00.000Z",
      reason: "Medical appointment",
      delegateUserId: manager.id
    }
  });

  assert.equal(validRequest.status, 201);

  const decision = await apiRequest(
    server.baseUrl,
    `/api/leave/requests/${validRequest.data.id}/decision`,
    {
      method: "POST",
      token: managerLogin.data.token,
      body: {
        action: "approved"
      }
    }
  );

  assert.equal(decision.status, 200);
  assert.equal(decision.data.status, "approved");

  const balances = await apiRequest(server.baseUrl, "/api/leave/balances", {
    token: employeeLogin.data.token
  });
  const annualBalance = balances.data.find((item) => item.leave_type === "annual");

  assert.equal(Number(annualBalance.balance_hours), 2);
});

test("overtime approval workflow exposes approved overtime records", async () => {
  const manager = await seedUser({
    email: "test-manager-overtime@example.com",
    fullName: "Overtime Manager",
    role: "manager"
  });
  await seedUser({
    email: "test-employee-overtime@example.com",
    fullName: "Overtime Employee",
    role: "employee",
    approverUserId: manager.id
  });

  const employeeLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-employee-overtime@example.com",
      password: "Password123!"
    }
  });
  const managerLogin = await apiRequest(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "test-manager-overtime@example.com",
      password: "Password123!"
    }
  });

  const overtimeRequest = await apiRequest(server.baseUrl, "/api/overtime/requests", {
    method: "POST",
    token: employeeLogin.data.token,
    body: {
      workDate: "2026-04-04",
      startAt: "2026-04-04T10:00:00.000Z",
      endAt: "2026-04-04T13:00:00.000Z",
      reason: "Month-end processing"
    }
  });

  assert.equal(overtimeRequest.status, 201);

  const decision = await apiRequest(
    server.baseUrl,
    `/api/overtime/requests/${overtimeRequest.data.id}/decision`,
    {
      method: "POST",
      token: managerLogin.data.token,
      body: {
        action: "approved"
      }
    }
  );

  assert.equal(decision.status, 200);
  assert.equal(decision.data.status, "approved");

  const approved = await apiRequest(server.baseUrl, "/api/overtime/approved", {
    token: employeeLogin.data.token
  });

  assert.equal(approved.status, 200);
  assert.equal(approved.data.length, 1);
  assert.equal(approved.data[0].status, "approved");
});

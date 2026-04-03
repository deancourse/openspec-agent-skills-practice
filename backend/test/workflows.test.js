import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import {
  apiRequest,
  closeTestPool,
  resetTestData,
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

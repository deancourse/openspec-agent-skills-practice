import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { getProfile, login, completePasswordSetup } from "../modules/auth/service.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  listUsers,
  updateUser
} from "../modules/users/repository.js";
import { issueSetupLink } from "../modules/auth/service.js";
import {
  clockIn,
  clockOut,
  decideMissedPunchRequest,
  getAttendancePolicy,
  listAttendance,
  listMissedPunchRequests,
  submitMissedPunchRequest,
  updateAttendancePolicy
} from "../modules/attendance/service.js";
import {
  decideLeaveRequest,
  listBalances,
  listLeaveRequests,
  seedBalance,
  submitLeaveRequest
} from "../modules/leave/service.js";
import {
  decideOvertimeRequest,
  listApprovedOvertime,
  listOvertimeRequests,
  submitOvertimeRequest
} from "../modules/overtime/service.js";
import { badRequest, notFound } from "../lib/errors.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const result = await login(req.body.email, req.body.password);
    res.json(result);
  })
);

router.post(
  "/auth/setup-password",
  asyncHandler(async (req, res) => {
    await completePasswordSetup(req.body.token, req.body.password);
    res.status(204).send();
  })
);

router.get(
  "/auth/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const profile = await getProfile(req.user.sub);
    res.json(profile);
  })
);

router.get(
  "/users",
  authenticate,
  authorize("admin"),
  asyncHandler(async (_req, res) => {
    const users = await listUsers();
    res.json(users);
  })
);

router.post(
  "/users",
  authenticate,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const existingUser = await findUserByEmail(req.body.email);

    if (existingUser) {
      throw badRequest("這個電子郵件已經被使用，請改用其他 Email。");
    }

    const user = await createUser({
      email: req.body.email,
      fullName: req.body.fullName,
      role: req.body.role ?? "employee",
      approverUserId: req.body.approverUserId ?? null,
      delegateUserId: req.body.delegateUserId ?? null
    });
    const setup = await issueSetupLink(user);
    await seedBalance(user.id, "annual", Number(req.body.annualBalanceHours ?? 0));
    await seedBalance(
      user.id,
      "compensatory",
      Number(req.body.compensatoryBalanceHours ?? 0)
    );

    let warning = null;

    try {
      const setup = await issueSetupLink(user);
      res.status(201).json({ user, setup, warning });
      return;
    } catch {
      warning =
        "使用者已建立，但密碼設定信寄送失敗。請確認 SMTP 設定，或稍後使用「補發設定信」。";
    }

    res.status(201).json({
      user,
      setup: null,
      warning
    });
  })
);

router.patch(
  "/users/:userId",
  authenticate,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const user = await updateUser(req.params.userId, {
      fullName: req.body.fullName,
      role: req.body.role,
      approverUserId: req.body.approverUserId,
      delegateUserId: req.body.delegateUserId,
      isActive: req.body.isActive
    });

    if (!user) {
      throw notFound("User not found");
    }

    res.json(user);
  })
);

router.post(
  "/users/:userId/resend-setup",
  authenticate,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const user = await findUserById(req.params.userId);

    if (!user) {
      throw notFound("User not found");
    }

    const setup = await issueSetupLink(user);
    res.json(setup);
  })
);

router.post(
  "/attendance/clock-in",
  authenticate,
  asyncHandler(async (req, res) => {
    const record = await clockIn(req.user.sub, req.body.note);
    res.status(201).json(record);
  })
);

router.get(
  "/attendance/policy",
  authenticate,
  asyncHandler(async (_req, res) => {
    const policy = await getAttendancePolicy();
    res.json(policy);
  })
);

router.patch(
  "/attendance/policy",
  authenticate,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const policy = await updateAttendancePolicy({
      workStartTime: req.body.workStartTime,
      workEndTime: req.body.workEndTime,
      graceMinutes: Number(req.body.graceMinutes ?? 0),
      missedPunchSubmissionDays: Number(req.body.missedPunchSubmissionDays ?? 3),
      missedPunchRequiresApproval: req.body.missedPunchRequiresApproval ?? true,
      missedPunchAutoApproveQuota: Number(req.body.missedPunchAutoApproveQuota ?? 1),
      missedPunchAllowAdminOverride: req.body.missedPunchAllowAdminOverride ?? true
    });
    res.json(policy);
  })
);

router.post(
  "/attendance/clock-out",
  authenticate,
  asyncHandler(async (req, res) => {
    const record = await clockOut(req.user.sub, req.body.note);
    res.status(201).json(record);
  })
);

router.get(
  "/attendance",
  authenticate,
  asyncHandler(async (req, res) => {
    const records = await listAttendance(req.user, req.query.userId ?? null);
    res.json(records);
  })
);

router.get(
  "/attendance/adjustments",
  authenticate,
  asyncHandler(async (req, res) => {
    const requests = await listMissedPunchRequests(req.user);
    res.json(requests);
  })
);

router.post(
  "/attendance/adjustments",
  authenticate,
  asyncHandler(async (req, res) => {
    const request = await submitMissedPunchRequest(req.user, {
      workDate: req.body.workDate,
      missingAction: req.body.missingAction,
      requestedTime: req.body.requestedTime,
      reason: req.body.reason
    });
    res.status(201).json(request);
  })
);

router.post(
  "/attendance/adjustments/:requestId/decision",
  authenticate,
  authorize("manager", "admin"),
  asyncHandler(async (req, res) => {
    const action = req.body.action;

    if (!action) {
      throw badRequest("Decision action is required");
    }

    const request = await decideMissedPunchRequest(
      req.user,
      req.params.requestId,
      action,
      req.body.comment
    );
    res.json(request);
  })
);

router.get(
  "/leave/balances",
  authenticate,
  asyncHandler(async (req, res) => {
    const balances = await listBalances(req.user.sub);
    res.json(balances);
  })
);

router.post(
  "/leave/requests",
  authenticate,
  asyncHandler(async (req, res) => {
    const payload = {
      leaveType: req.body.leaveType,
      startAt: req.body.startAt,
      endAt: req.body.endAt,
      reason: req.body.reason,
      delegateUserId: req.body.delegateUserId,
      approverUserId: req.body.approverUserId ?? req.user.approverUserId
    };

    const request = await submitLeaveRequest(req.user, payload);
    res.status(201).json(request);
  })
);

router.get(
  "/leave/requests",
  authenticate,
  asyncHandler(async (req, res) => {
    const requests = await listLeaveRequests(req.user);
    res.json(requests);
  })
);

router.post(
  "/leave/requests/:requestId/decision",
  authenticate,
  authorize("manager", "admin"),
  asyncHandler(async (req, res) => {
    const action = req.body.action;

    if (!action) {
      throw badRequest("Decision action is required");
    }

    const request = await decideLeaveRequest(
      req.user,
      req.params.requestId,
      action,
      req.body.comment
    );
    res.json(request);
  })
);

router.post(
  "/overtime/requests",
  authenticate,
  asyncHandler(async (req, res) => {
    const request = await submitOvertimeRequest(req.user, {
      workDate: req.body.workDate,
      startAt: req.body.startAt,
      endAt: req.body.endAt,
      reason: req.body.reason,
      approverUserId: req.body.approverUserId ?? req.user.approverUserId
    });
    res.status(201).json(request);
  })
);

router.get(
  "/overtime/requests",
  authenticate,
  asyncHandler(async (req, res) => {
    const requests = await listOvertimeRequests(req.user);
    res.json(requests);
  })
);

router.post(
  "/overtime/requests/:requestId/decision",
  authenticate,
  authorize("manager", "admin"),
  asyncHandler(async (req, res) => {
    const request = await decideOvertimeRequest(
      req.user,
      req.params.requestId,
      req.body.action,
      req.body.comment
    );
    res.json(request);
  })
);

router.get(
  "/overtime/approved",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.query.userId ?? req.user.sub;
    const requests = await listApprovedOvertime(userId);
    res.json(requests);
  })
);

export default router;

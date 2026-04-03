import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import { formatDate, formatDateTimeInput, roleLabels } from "../presentation.js";

const initialForm = {
  email: "",
  fullName: "",
  role: "employee",
  approverUserId: "",
  delegateUserId: "",
  annualBalanceHours: 80,
  compensatoryBalanceHours: 0
};

const initialPolicyForm = {
  workStartTime: "09:00",
  workEndTime: "18:00",
  graceMinutes: 0,
  missedPunchSubmissionDays: 3,
  missedPunchRequiresApproval: true,
  missedPunchAutoApproveQuota: 1,
  missedPunchAllowAdminOverride: true
};

export function AdminPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [policyForm, setPolicyForm] = useState(initialPolicyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [userData, policyData, adjustmentData] = await Promise.all([
      api.listUsers(token),
      api.attendancePolicy(token),
      api.attendanceAdjustments(token)
    ]);
    setUsers(userData);
    setAdjustments(adjustmentData);
    setPolicyForm({
      workStartTime: String(policyData.work_start_time ?? "09:00:00").slice(0, 5),
      workEndTime: String(policyData.work_end_time ?? "18:00:00").slice(0, 5),
      graceMinutes: Number(policyData.grace_minutes ?? 0),
      missedPunchSubmissionDays: Number(policyData.missed_punch_submission_days ?? 3),
      missedPunchRequiresApproval: Boolean(
        policyData.missed_punch_requires_approval ?? true
      ),
      missedPunchAutoApproveQuota: Number(
        policyData.missed_punch_auto_approve_quota ?? 1
      ),
      missedPunchAllowAdminOverride: Boolean(
        policyData.missed_punch_allow_admin_override ?? true
      )
    });
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const payload = {
      ...form,
      approverUserId: form.approverUserId || null,
      delegateUserId: form.delegateUserId || null
    };

    try {
      const result = await api.createUser(token, payload);
      const parts = ["使用者已建立。"];

      if (result.setup?.setupUrl) {
        parts.push(`密碼設定連結：${result.setup.setupUrl}`);
      }

      if (result.warning) {
        parts.push(result.warning);
      }

      setMessage(parts.join(" "));
      setForm({ ...initialForm });
      await load();
    } catch (submitError) {
      setError(submitError.message);
      await load();
    }
  };

  const toggleActive = async (user) => {
    await api.updateUser(token, user.id, { isActive: !user.is_active });
    await load();
  };

  const resendSetup = async (userId) => {
    setError("");
    const result = await api.resendSetup(token, userId);
    setMessage(`已重新寄送設定連結：${result.setupUrl}`);
  };

  const handlePolicySave = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await api.updateAttendancePolicy(token, policyForm);
      setMessage("上下班時間區間已更新，之後的打卡將依此規則判定。");
      await load();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const handleAdjustmentDecision = async (requestId, action) => {
    setError("");
    setMessage("");

    try {
      await api.decideAttendanceAdjustment(token, requestId, {
        action,
        comment: action === "rejected" ? "管理端退回補登申請。" : "管理端核准補登申請。"
      });
      setMessage(action === "approved" ? "補登申請已核准。" : "補登申請已退回。");
      await load();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <div className="stack">
      <section className="section-heading">
        <p className="eyebrow">管理控制台</p>
        <h2>人員與權限設定</h2>
        <p>建立新帳號、設定角色、停用使用者，並維持年假與補休初始額度。</p>
      </section>
      <section className="grid two-up">
        <form className="card form" onSubmit={handleCreate}>
          <h3>新增使用者</h3>
          <label>
            姓名
            <input
              value={form.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            />
          </label>
          <label>
            電子郵件
            <input
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label>
            角色
            <select
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
            >
              <option value="employee">一般員工</option>
              <option value="manager">主管</option>
              <option value="admin">管理者</option>
            </select>
          </label>
          <label>
            預設簽核人 ID
            <input
              placeholder="可先留空"
              value={form.approverUserId}
              onChange={(event) =>
                setForm({ ...form, approverUserId: event.target.value })
              }
            />
          </label>
          <label>
            預設代理人 ID
            <input
              placeholder="可先留空"
              value={form.delegateUserId}
              onChange={(event) =>
                setForm({ ...form, delegateUserId: event.target.value })
              }
            />
          </label>
          <label>
            年假時數
            <input
              type="number"
              value={form.annualBalanceHours}
              onChange={(event) =>
                setForm({ ...form, annualBalanceHours: Number(event.target.value) })
              }
            />
          </label>
          <label>
            補休時數
            <input
              type="number"
              value={form.compensatoryBalanceHours}
              onChange={(event) =>
                setForm({
                  ...form,
                  compensatoryBalanceHours: Number(event.target.value)
                })
              }
            />
          </label>
          <button type="submit">建立帳號</button>
          {message && <p className="success">{message}</p>}
          {error && <p className="error">{error}</p>}
        </form>

        <div className="card">
          <h3>使用者列表</h3>
          <div className="table">
            <div className="table-row table-head">
              <span>姓名</span>
              <span>角色</span>
              <span>狀態</span>
              <span>操作</span>
            </div>
            {users.map((user) => (
              <div className="table-row" key={user.id}>
                <span>
                  {user.full_name}
                  <small>{user.email}</small>
                </span>
                <span>{roleLabels[user.role] ?? user.role}</span>
                <span>{user.is_active ? "啟用中" : "已停用"}</span>
                <span className="inline-actions">
                  <button type="button" onClick={() => toggleActive(user)}>
                    {user.is_active ? "停用" : "啟用"}
                  </button>
                  <button type="button" onClick={() => resendSetup(user.id)}>
                    補發設定信
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid two-up">
        <form className="card form" onSubmit={handlePolicySave}>
          <h3>出勤時間設定</h3>
          <label>
            上班時間
            <input
              type="time"
              value={policyForm.workStartTime}
              onChange={(event) =>
                setPolicyForm({ ...policyForm, workStartTime: event.target.value })
              }
            />
          </label>
          <label>
            下班時間
            <input
              type="time"
              value={policyForm.workEndTime}
              onChange={(event) =>
                setPolicyForm({ ...policyForm, workEndTime: event.target.value })
              }
            />
          </label>
          <label>
            緩衝分鐘數
            <input
              type="number"
              min="0"
              value={policyForm.graceMinutes}
              onChange={(event) =>
                setPolicyForm({
                  ...policyForm,
                  graceMinutes: Number(event.target.value)
                })
              }
            />
          </label>
          <label>
            忘打卡補登期限
            <input
              type="number"
              min="0"
              value={policyForm.missedPunchSubmissionDays}
              onChange={(event) =>
                setPolicyForm({
                  ...policyForm,
                  missedPunchSubmissionDays: Number(event.target.value)
                })
              }
            />
          </label>
          <label>
            每月自動通過額度
            <input
              type="number"
              min="0"
              value={policyForm.missedPunchAutoApproveQuota}
              onChange={(event) =>
                setPolicyForm({
                  ...policyForm,
                  missedPunchAutoApproveQuota: Number(event.target.value)
                })
              }
            />
          </label>
          <label>
            補登需人工審核
            <select
              value={policyForm.missedPunchRequiresApproval ? "true" : "false"}
              onChange={(event) =>
                setPolicyForm({
                  ...policyForm,
                  missedPunchRequiresApproval: event.target.value === "true"
                })
              }
            >
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </label>
          <label>
            允許管理者介入逾期案件
            <select
              value={policyForm.missedPunchAllowAdminOverride ? "true" : "false"}
              onChange={(event) =>
                setPolicyForm({
                  ...policyForm,
                  missedPunchAllowAdminOverride: event.target.value === "true"
                })
              }
            >
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </label>
          <button type="submit">儲存出勤規則</button>
        </form>

        <article className="card stat-card accent-card">
          <h3>規則說明</h3>
          <p>員工上班打卡時，系統會拿目前時間與「上班時間 + 緩衝分鐘數」比較。</p>
          <p>若超過，就會回傳遲到訊息，但仍會完成打卡紀錄。</p>
          <p>忘打卡可設定補登期限、自動通過額度，以及是否預設改走人工審核。</p>
        </article>
      </section>

      <section className="card">
        <h3>待處理忘打卡補登</h3>
        <div className="table">
          <div className="table-row table-head">
            <span>員工</span>
            <span>日期</span>
            <span>類型</span>
            <span>時間</span>
            <span>操作</span>
          </div>
          {adjustments
            .filter((request) => request.adjustment_status === "pending")
            .map((request) => (
              <div className="table-row" key={request.id}>
                <span>{request.user_name}</span>
                <span>{formatDate(request.work_date)}</span>
                <span>{request.missing_action === "clock_in" ? "補上班卡" : "補下班卡"}</span>
                <span>{formatDateTimeInput(request.requested_time)}</span>
                <span className="inline-actions">
                  <button
                    type="button"
                    onClick={() => handleAdjustmentDecision(request.id, "approved")}
                  >
                    核准
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleAdjustmentDecision(request.id, "rejected")}
                  >
                    退回
                  </button>
                </span>
              </div>
            ))}
        </div>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </section>
    </div>
  );
}

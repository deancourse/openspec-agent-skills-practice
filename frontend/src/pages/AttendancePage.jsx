import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import {
  buildLocalIsoString,
  formatDate,
  formatDateTimeInput,
  formatTime
} from "../presentation.js";

const initialAdjustmentForm = {
  workDate: "",
  missingAction: "clock_in",
  requestedTime: "",
  reason: ""
};

export function AttendancePage() {
  const { token, user } = useAuth();
  const [records, setRecords] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [adjustments, setAdjustments] = useState([]);
  const [clockMessage, setClockMessage] = useState("");
  const [adjustmentMessage, setAdjustmentMessage] = useState("");
  const [error, setError] = useState("");
  const [adjustmentForm, setAdjustmentForm] = useState(initialAdjustmentForm);

  const load = async () => {
    const [attendanceData, policyData, adjustmentData] = await Promise.all([
      api.attendance(token),
      api.attendancePolicy(token),
      api.attendanceAdjustments(token)
    ]);
    setRecords(attendanceData);
    setPolicy(policyData);
    setAdjustments(adjustmentData);
  };

  useEffect(() => {
    load();
  }, []);

  const submitAdjustment = async (event) => {
    event.preventDefault();
    setError("");
    setAdjustmentMessage("");

    try {
      const requestedTime = buildLocalIsoString(
        adjustmentForm.workDate,
        adjustmentForm.requestedTime
      );
      const result = await api.submitAttendanceAdjustment(token, {
        workDate: adjustmentForm.workDate,
        missingAction: adjustmentForm.missingAction,
        requestedTime,
        reason: adjustmentForm.reason
      });

      setAdjustmentMessage(
        result.status === "approved"
          ? "補登申請已自動通過，出勤摘要會立即套用。"
          : "補登申請已送出，等待主管或管理者審核。"
      );
      setAdjustmentForm(initialAdjustmentForm);
      await load();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <div className="stack">
      <section className="section-heading">
        <p className="eyebrow">出勤流程</p>
        <h2>打卡與出勤紀錄</h2>
        <p>顯示每天的有效出勤摘要，並支援忘打卡補登申請與待審狀態追蹤。</p>
      </section>

      <section className="card toolbar">
        <button
          type="button"
          onClick={async () => {
            setError("");
            const result = await api.clockIn(token);
            setClockMessage(result.lateStatus?.message ?? "已完成上班打卡。");
            await load();
          }}
        >
          上班打卡
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={async () => {
            setError("");
            const result = await api.clockOut(token);
            setClockMessage(result.message ?? "已完成下班打卡。");
            await load();
          }}
        >
          下班打卡
        </button>
      </section>

      <section className="grid two-up">
        <article className="card stat-card">
          <h3>目前出勤規則</h3>
          <p>
            上班時間：{String(policy?.work_start_time ?? "09:00:00").slice(0, 5)}，
            下班時間：{String(policy?.work_end_time ?? "18:00:00").slice(0, 5)}
          </p>
          <p>緩衝：{Number(policy?.grace_minutes ?? 0)} 分鐘</p>
          <p>補登期限：{Number(policy?.missed_punch_submission_days ?? 3)} 天內</p>
          <p>
            自動通過額度：每月 {Number(policy?.missed_punch_auto_approve_quota ?? 1)} 次
          </p>
        </article>

        <article className="card stat-card accent-card">
          <h3>打卡與補登回饋</h3>
          <p>{clockMessage || "完成打卡後，系統會在這裡提示是否有遲到。"}</p>
          <p>{adjustmentMessage || "送出補登後，系統會依規則自動通過或送審。"}</p>
          <p>日摘要只會套用已核准的補登，待審資料會另外標示。</p>
        </article>
      </section>

      <section className="grid two-up">
        <form className="card form" onSubmit={submitAdjustment}>
          <h3>忘打卡補登</h3>
          <label>
            日期
            <input
              type="date"
              value={adjustmentForm.workDate}
              onChange={(event) =>
                setAdjustmentForm({ ...adjustmentForm, workDate: event.target.value })
              }
            />
          </label>
          <label>
            補登類型
            <select
              value={adjustmentForm.missingAction}
              onChange={(event) =>
                setAdjustmentForm({ ...adjustmentForm, missingAction: event.target.value })
              }
            >
              <option value="clock_in">補上班卡</option>
              <option value="clock_out">補下班卡</option>
            </select>
          </label>
          <label>
            補登時間
            <input
              type="time"
              value={adjustmentForm.requestedTime}
              onChange={(event) =>
                setAdjustmentForm({
                  ...adjustmentForm,
                  requestedTime: event.target.value
                })
              }
            />
          </label>
          <label>
            原因說明
            <textarea
              rows="3"
              value={adjustmentForm.reason}
              onChange={(event) =>
                setAdjustmentForm({ ...adjustmentForm, reason: event.target.value })
              }
            />
          </label>
          <button type="submit">送出補登申請</button>
          {error && <p className="error">{error}</p>}
        </form>

        <article className="card">
          <h3>補登規則提醒</h3>
          <p>系統會先檢查申請是否在補登期限內。</p>
          <p>符合規則且仍有額度時，申請可自動通過；其餘情況會轉待審。</p>
          <p>待審申請不會立刻改變遲到或有效上下班時間。</p>
        </article>
      </section>

      <section className="card">
        <h3>{user?.role === "employee" ? "每日出勤摘要" : "可見範圍出勤摘要"}</h3>
        <div className="table">
          <div className="table-row table-head">
            <span>使用者</span>
            <span>日期</span>
            <span>有效上班</span>
            <span>有效下班</span>
            <span>狀態</span>
          </div>
          {records.map((record) => (
            <div className="table-row" key={`${record.user_id}-${record.work_date}`}>
              <span>{record.user_name}</span>
              <span>{formatDate(record.work_date)}</span>
              <span>{formatTime(record.first_clock_in)}</span>
              <span>{formatTime(record.last_clock_out)}</span>
              <span>
                {record.late_summary?.label ?? "-"}
                <small>{record.adjustment_status_label ?? "原始打卡"}</small>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>{user?.role === "employee" ? "我的補登申請" : "可見範圍補登申請"}</h3>
        <div className="table">
          <div className="table-row table-head">
            <span>日期</span>
            <span>類型</span>
            <span>補登時間</span>
            <span>狀態</span>
            <span>說明</span>
          </div>
          {adjustments.map((request) => (
            <div className="table-row" key={request.id}>
              <span>{formatDate(request.work_date)}</span>
              <span>{request.missing_action === "clock_in" ? "補上班卡" : "補下班卡"}</span>
              <span>{formatDateTimeInput(request.requested_time)}</span>
              <span>
                {request.adjustment_status === "approved"
                  ? "已核准"
                  : request.adjustment_status === "rejected"
                    ? "已拒絕"
                    : "待審核"}
              </span>
              <span>{request.review_comment || request.reason}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

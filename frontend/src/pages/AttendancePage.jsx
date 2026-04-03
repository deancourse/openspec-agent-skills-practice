import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import { formatDate, formatTime } from "../presentation.js";

export function AttendancePage() {
  const { token, user } = useAuth();
  const [records, setRecords] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [clockMessage, setClockMessage] = useState("");

  const load = async () => {
    const [attendanceData, policyData] = await Promise.all([
      api.attendance(token),
      api.attendancePolicy(token)
    ]);
    setRecords(attendanceData);
    setPolicy(policyData);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="stack">
      <section className="section-heading">
        <p className="eyebrow">出勤流程</p>
        <h2>打卡與出勤紀錄</h2>
        <p>顯示每天的出勤摘要，以上班第一筆與下班最後一筆作為當日基準。</p>
      </section>

      <section className="card toolbar">
        <button
          type="button"
          onClick={async () => {
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
        </article>

        <article className="card stat-card accent-card">
          <h3>打卡回饋</h3>
          <p>{clockMessage || "完成打卡後，系統會在這裡提示是否有遲到。"}</p>
          <p>同一天內，系統以上班第一筆與下班最後一筆作為當日計算基準。</p>
        </article>
      </section>

      <section className="card">
        <h3>{user?.role === "employee" ? "每日出勤摘要" : "可見範圍出勤摘要"}</h3>
        <div className="table">
          <div className="table-row table-head">
            <span>使用者</span>
            <span>日期</span>
            <span>上班</span>
            <span>下班</span>
            <span>狀態</span>
          </div>
          {records.map((record) => (
            <div className="table-row" key={`${record.user_id}-${record.work_date}`}>
              <span>{record.user_name}</span>
              <span>{formatDate(record.work_date)}</span>
              <span>{formatTime(record.first_clock_in)}</span>
              <span>{formatTime(record.last_clock_out)}</span>
              <span>{record.late_summary?.label ?? "-"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

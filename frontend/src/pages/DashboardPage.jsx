import { useAuth } from "../context/AuthContext.jsx";
import { roleLabels } from "../presentation.js";
import { Link } from "react-router-dom";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="stack">
      <section className="hero">
        <div>
          <p className="eyebrow">每日工作台</p>
          <h2>{user?.fullName}，今天的出勤節奏已準備好。</h2>
          <p>
            依據你的角色，可以在這裡處理打卡、請假、加班，以及必要的簽核工作。
          </p>
        </div>
        <div className="hero-panel">
          <span>目前身份</span>
          <strong>{roleLabels[user?.role] ?? user?.role}</strong>
          <small>登入後的功能會依角色自動切換。</small>
        </div>
      </section>
      <section className="grid dashboard-grid">
        <article className="card stat-card accent-card">
          <h3>工作提醒</h3>
          <p>先完成打卡，再檢查是否有待送出的請假或加班申請。</p>
        </article>
        <article className="card stat-card">
          <h3>請假流程</h3>
          <p>支援年假、補休、事假、病假，並可指定代理人交接。</p>
        </article>
        <article className="card stat-card">
          <h3>加班流程</h3>
          <p>提交加班時段與事由後，可持續追蹤主管的簽核結果。</p>
        </article>
        <article className="card stat-card">
          <h3>管理維度</h3>
          <p>管理者可維護帳號與角色；主管則可處理下屬相關簽核。</p>
        </article>
      </section>

      <section className="grid dashboard-grid">
        <Link className="card feature-link" to="/leave">
          <p className="eyebrow">Primary Flow</p>
          <h3>前往請假申請</h3>
          <p>快速送出假單、確認時數、查看簽核結果與代理人安排。</p>
        </Link>
        <Link className="card feature-link" to="/overtime">
          <p className="eyebrow">Primary Flow</p>
          <h3>前往加班申請</h3>
          <p>建立加班單、追蹤審核進度，並保留後續補休換算資料。</p>
        </Link>
      </section>
    </div>
  );
}

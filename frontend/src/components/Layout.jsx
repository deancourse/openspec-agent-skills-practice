import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { roleLabels } from "../presentation.js";

export function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">勤</div>
          <div>
            <p className="sidebar-kicker">Workforce Console</p>
            <h1>出缺勤管理</h1>
            <p className="sidebar-user">{user?.fullName}</p>
            <small>{roleLabels[user?.role] ?? user?.role}</small>
          </div>
        </div>
        <nav>
          <NavLink to="/">總覽儀表板</NavLink>
          {user?.role === "admin" && <NavLink to="/admin">人員與權限</NavLink>}
          <NavLink to="/attendance">打卡紀錄</NavLink>
          <NavLink to="/leave">請假申請</NavLink>
          <NavLink to="/overtime">加班申請</NavLink>
        </nav>
        <div className="sidebar-footer">
          <p>今天適合把流程做得更順。</p>
          <button type="button" onClick={logout}>
            登出系統
          </button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

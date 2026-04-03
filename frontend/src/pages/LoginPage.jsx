import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await login(form);
      navigate("/");
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <section className="auth-intro">
          <p className="eyebrow">Attendance Control Deck</p>
          <h2>把打卡、請假、加班與簽核，收斂到同一個工作台。</h2>
          <p>
            這個系統提供管理者、主管與員工不同視角，讓日常行政流程清楚、
            留痕、可追蹤。
          </p>
          <div className="auth-panels">
            <article className="auth-note">
              <span>01</span>
              <p>管理者可建立人員、設定角色、補發密碼設定連結。</p>
            </article>
            <article className="auth-note">
              <span>02</span>
              <p>員工可快速打卡，提交請假與加班申請。</p>
            </article>
            <article className="auth-note">
              <span>03</span>
              <p>主管可集中查看待簽核事項與下屬的出勤紀錄。</p>
            </article>
          </div>
        </section>

        <form className="card form auth-card" onSubmit={handleSubmit}>
          <p className="eyebrow">登入入口</p>
          <h2>登入系統</h2>
          <label>
            電子郵件
            <input
              placeholder="name@company.com"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label>
            密碼
            <input
              type="password"
              placeholder="請輸入密碼"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit">登入</button>
        </form>
      </div>
    </div>
  );
}

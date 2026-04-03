import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";

export function SetupPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await api.setupPassword({ token, password });
      setStatus("success");
      setMessage("密碼設定完成，現在可以回登入頁登入。");
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  return (
    <div className="auth-page">
      <form className="card form auth-card" onSubmit={handleSubmit}>
        <p className="eyebrow">首次啟用</p>
        <h2>設定登入密碼</h2>
        <label>
          新密碼
          <input
            type="password"
            placeholder="至少輸入一組安全密碼"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button type="submit">儲存密碼</button>
        {status !== "idle" && (
          <p className={status === "error" ? "error" : "success"}>{message}</p>
        )}
      </form>
    </div>
  );
}

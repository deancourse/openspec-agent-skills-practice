import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import { formatDateTime, leaveTypeLabels, statusLabels } from "../presentation.js";

const initialForm = {
  leaveType: "annual",
  startAt: "",
  endAt: "",
  reason: "",
  delegateUserId: "",
  approverUserId: ""
};

export function LeavePage() {
  const { token, user } = useAuth();
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [balanceData, requestData] = await Promise.all([
      api.leaveBalances(token),
      api.leaveRequests(token)
    ]);
    setBalances(balanceData);
    setRequests(requestData);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="stack">
      <section className="section-heading">
        <p className="eyebrow">假勤流程</p>
        <h2>請假與代理人安排</h2>
        <p>送出假單前可先確認剩餘時數，並指定代理人與簽核主管。</p>
      </section>

      <section className="grid dashboard-grid">
        <article className="card stat-card accent-card">
          <h3>快速送單</h3>
          <p>先選假別與請假時段，再填代理人與說明即可送出。</p>
        </article>
        <article className="card stat-card">
          <h3>簽核追蹤</h3>
          <p>所有假單會集中顯示在下方，方便員工與主管快速追蹤。</p>
        </article>
        <article className="card stat-card">
          <h3>時數確認</h3>
          <p>年假與補休會在送單前比對剩餘時數，避免送出無效申請。</p>
        </article>
      </section>

      <section className="grid two-up">
        <form
          className="card form"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setMessage("");

            try {
              await api.submitLeave(token, form);
              setMessage("請假單已送出，請等待簽核。");
              setForm(initialForm);
              await load();
            } catch (submitError) {
              setError(submitError.message);
            }
          }}
        >
          <h3>新增請假單</h3>
          <label>
            假別
            <select
              value={form.leaveType}
              onChange={(event) => setForm({ ...form, leaveType: event.target.value })}
            >
              <option value="annual">年假</option>
              <option value="compensatory">補休</option>
              <option value="sick">病假</option>
              <option value="personal">事假</option>
            </select>
          </label>
          <label>
            開始時間
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(event) => setForm({ ...form, startAt: event.target.value })}
            />
          </label>
          <label>
            結束時間
            <input
              type="datetime-local"
              value={form.endAt}
              onChange={(event) => setForm({ ...form, endAt: event.target.value })}
            />
          </label>
          <label>
            代理人 ID
            <input
              placeholder="請輸入代理人使用者 ID"
              value={form.delegateUserId}
              onChange={(event) =>
                setForm({ ...form, delegateUserId: event.target.value })
              }
            />
          </label>
          <label>
            簽核主管 ID
            <input
              placeholder="可留空，沿用預設簽核人"
              value={form.approverUserId}
              onChange={(event) =>
                setForm({ ...form, approverUserId: event.target.value })
              }
            />
          </label>
          <label>
            申請說明
            <textarea
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
            />
          </label>
          <button type="submit">送出請假單</button>
          {message && <p className="success">{message}</p>}
          {error && <p className="error">{error}</p>}
        </form>

        <div className="card">
          <h3>可用時數</h3>
          <div className="table">
            <div className="table-row table-head">
              <span>假別</span>
              <span>時數</span>
            </div>
            {balances.map((balance) => (
              <div className="table-row" key={balance.leave_type}>
                <span>{leaveTypeLabels[balance.leave_type] ?? balance.leave_type}</span>
                <span>{balance.balance_hours} 小時</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h3>請假申請紀錄</h3>
        <div className="table">
          <div className="table-row table-head">
            <span>假別</span>
            <span>請假區間</span>
            <span>狀態</span>
            <span>操作</span>
          </div>
          {requests.map((request) => (
            <div className="table-row" key={request.id}>
              <span>{leaveTypeLabels[request.leave_type] ?? request.leave_type}</span>
              <span>
                {formatDateTime(request.start_at)} - {formatDateTime(request.end_at)}
              </span>
              <span>{statusLabels[request.status] ?? request.status}</span>
              <span className="inline-actions">
                {(user?.role === "manager" || user?.role === "admin") &&
                request.status === "pending" ? (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        await api.decideLeave(token, request.id, { action: "approved" });
                        await load();
                      }}
                    >
                      核准
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={async () => {
                        await api.decideLeave(token, request.id, { action: "rejected" });
                        await load();
                      }}
                    >
                      退回
                    </button>
                  </>
                ) : (
                  "-"
                )}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

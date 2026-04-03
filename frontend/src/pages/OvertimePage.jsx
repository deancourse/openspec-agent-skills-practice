import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import { formatDate, statusLabels } from "../presentation.js";

const initialForm = {
  workDate: "",
  startAt: "",
  endAt: "",
  reason: "",
  approverUserId: ""
};

export function OvertimePage() {
  const { token, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [approved, setApproved] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [requestData, approvedData] = await Promise.all([
      api.overtimeRequests(token),
      api.approvedOvertime(token)
    ]);
    setRequests(requestData);
    setApproved(approvedData);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="stack">
      <section className="section-heading">
        <p className="eyebrow">延長工時</p>
        <h2>加班申請與審核</h2>
        <p>統一記錄加班日期、時段與事由，並保留後續補休換算的資料基礎。</p>
      </section>

      <section className="grid dashboard-grid">
        <article className="card stat-card accent-card">
          <h3>快速申請</h3>
          <p>先填寫加班日期、開始與結束時間，再補充加班事由送審。</p>
        </article>
        <article className="card stat-card">
          <h3>核准追蹤</h3>
          <p>下方會同時顯示申請紀錄與已核准清單，方便追蹤進度。</p>
        </article>
        <article className="card stat-card">
          <h3>補休基礎</h3>
          <p>已核准的加班資料會保留，供後續補休規則或報表使用。</p>
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
              await api.submitOvertime(token, form);
              setMessage("加班單已送出，請等待簽核。");
              setForm(initialForm);
              await load();
            } catch (submitError) {
              setError(submitError.message);
            }
          }}
        >
          <h3>新增加班單</h3>
          <label>
            加班日期
            <input
              type="date"
              value={form.workDate}
              onChange={(event) => setForm({ ...form, workDate: event.target.value })}
            />
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
            加班事由
            <textarea
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
            />
          </label>
          <button type="submit">送出加班單</button>
          {message && <p className="success">{message}</p>}
          {error && <p className="error">{error}</p>}
        </form>

        <div className="card">
          <h3>已核准加班紀錄</h3>
          <div className="table">
            <div className="table-row table-head">
              <span>日期</span>
              <span>時數</span>
              <span>狀態</span>
            </div>
            {approved.map((record) => (
              <div className="table-row" key={record.id}>
                <span>{formatDate(record.work_date)}</span>
                <span>{record.hours_requested} 小時</span>
                <span>{statusLabels[record.status] ?? record.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h3>加班申請紀錄</h3>
        <div className="table">
          <div className="table-row table-head">
            <span>日期</span>
            <span>時數</span>
            <span>狀態</span>
            <span>操作</span>
          </div>
          {requests.map((request) => (
            <div className="table-row" key={request.id}>
              <span>{formatDate(request.work_date)}</span>
              <span>{request.hours_requested} 小時</span>
              <span>{statusLabels[request.status] ?? request.status}</span>
              <span className="inline-actions">
                {(user?.role === "manager" || user?.role === "admin") &&
                request.status === "pending" ? (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        await api.decideOvertime(token, request.id, {
                          action: "approved"
                        });
                        await load();
                      }}
                    >
                      核准
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={async () => {
                        await api.decideOvertime(token, request.id, {
                          action: "rejected"
                        });
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

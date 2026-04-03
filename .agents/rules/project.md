# Project Context

## 1. Project Overview

- 出缺勤管理系統 MVP。
- 目標：整合登入、首次設密碼、打卡、請假、加班、主管簽核、管理者帳號維護。
- 目前是本機開發優先的單體專案：前端與後端分開執行，資料庫用 Docker。
- 需求與變更來源另有 OpenSpec 文件；實作時要同時對齊 `openspec/` 與現有程式碼。

## 2. Tech Stack

- Workspace monorepo：root `package.json` 管理 `frontend`、`backend` workspaces。
- Frontend：React 18、Vite 5、React Router 6、ESLint 9。
- Backend：Node.js ESM、Express 4、`pg`、`jsonwebtoken`、`bcryptjs`、`nodemailer`、`dotenv`。
- Database：PostgreSQL 16；無 ORM，直接寫 SQL。
- Testing：backend 使用原生 `node:test`；目前無 frontend 測試框架。
- Infra：`docker-compose.yml` 只啟動 `postgres`、`pgadmin`。

## 3. Architecture

- 前後端分離；前端呼叫 REST API，後端集中於 `/api`。
- 後端分層偏向：
  - `routes`：HTTP 路由、middleware 組裝、request body 轉交 service。
  - `modules/*/service.js`：業務規則、權限範圍、交易邏輯。
  - `modules/*/repository.js`：資料存取；目前只在部分模組使用。
  - `db`：Postgres pool、transaction helper、SQL migrations。
  - `middleware`：JWT 驗證、角色授權、錯誤輸出。
- 前端分層偏向：
  - `api.js`：所有 API 呼叫入口。
  - `context/AuthContext.jsx`：登入 token 與目前使用者狀態。
  - `pages/*`：頁面級資料讀寫與表單狀態。
  - `components/*`：版型與 route guard。
  - `presentation.js`：顯示用 label / formatter。
  - `styles.css`：單一全域樣式檔。
- 資料命名目前以前後端直通為主：API 回傳大量沿用 DB `snake_case` 欄位，frontend 直接消費。

## 4. Directory Responsibilities

- `frontend/src/api.js`
  - 新增 API 呼叫優先集中於此；不要在 page/component 內直接寫 `fetch`。
- `frontend/src/context/AuthContext.jsx`
  - token 存放與登入狀態唯一來源；不要在其他地方各自管理登入狀態。
- `frontend/src/pages`
  - 頁面層負責 `useEffect + useState` 載入資料、送表單、顯示成功/錯誤訊息。
- `frontend/src/components`
  - 放可重用 UI 殼層與權限守門，不承擔主要商業流程。
- `frontend/src/presentation.js`
  - 文案對照、日期格式化、狀態 label 集中處理。
- `frontend/src/styles.css`
  - 全域樣式集中；目前沒有 CSS Modules / Tailwind / UI framework。
- `backend/src/routes/index.js`
  - 單一 API router；新 API 目前集中加在這裡。
- `backend/src/modules/*`
  - 依領域拆模組：`auth`、`users`、`attendance`、`leave`、`overtime`、`notifications`。
- `backend/src/db/migrations`
  - 以流水號 SQL migration 管 schema；修改 schema 時延續此模式，不要改舊 migration。
- `backend/test`
  - 以 API workflow 測試為主；`helpers/integration.js` 提供啟 server、seed、reset。
- `openspec/`
  - 規格與變更流程來源，不是執行碼；改需求前先比對這裡與實作是否一致。

## 5. Development Conventions

- 使用 ESM `import/export`；後端與前端都沒有 TypeScript。
- 後端新增非同步 route handler 時，包 `asyncHandler`，錯誤交給 `errorHandler`。
- 後端若要回傳可預期錯誤，使用 `badRequest` / `unauthorized` / `forbidden` / `notFound`；不要手寫不一致格式。
- 後端錯誤回應格式固定為 `{ error: string }`；前端依賴這個格式顯示 `error.message`。
- 權限控制依賴 JWT payload 內的 `role` 與 `sub`；保護路由先 `authenticate`，再 `authorize(...)`。
- 若需要跨表一致性，使用 `withTransaction()`；`leave` 與 `overtime` 決策流程已採此模式。
- DB 查詢以參數化 SQL 為主；延續 `$1, $2...` 形式，不要字串拼接值。
- Frontend 資料取得以 page-level `load()` + `useEffect(() => { load(); }, [])` 為現有慣例。
- Frontend 錯誤與成功提示目前多為頁面區域 `message` / `error` state；尚無全域通知系統。
- 角色顯示、假別顯示、狀態顯示、日期格式化集中在 `presentation.js`；不要在頁面重複寫對照表。
- 命名慣例：
  - React 元件檔與匯出使用 PascalCase。
  - hooks/context 使用 React 慣例命名。
  - backend 模組函式使用 camelCase。
  - DB schema 與 API 大部分欄位維持 snake_case。
- UI 目前已有明確視覺方向：
  - 單頁殼層 + sidebar。
  - 中文介面文案。
  - 全域配色 / 字體變數在 `styles.css`。
  - 若非必要，不要引入新的 UI framework。

## 6. Data Flow / State / API Rules

- Auth 流程：
  - `login` 取得 JWT。
  - token 存於 `localStorage` key `attendance-token`。
  - app 啟動後以 `/auth/me` 還原使用者。
  - `ProtectedRoute` 負責未登入導向與角色限制。
- API 呼叫規則：
  - 由 `api.js` 注入 `Authorization: Bearer <token>`。
  - `204` 視為 `null`。
  - 失敗時拋 `Error(data.error ?? "Request failed")`。
- 狀態管理：
  - 全域只有 AuthContext。
  - 業務資料全在各 page 的 local state，沒有 Redux / Zustand / React Query。
- 後端資料流：
  - route 只負責接 HTTP。
  - service 做驗證、權限範圍、商業規則。
  - repository / SQL 回傳 DB row。
- 請假規則：
  - `annual`、`compensatory` 送單前會檢查 `leave_balances`。
  - 核准後才扣額度。
  - `delegateUserId` 必填。
- 加班規則：
  - 送單時需能推得 `approverUserId`。
  - 核准只記錄 request 與 approval；補休自動換算尚未實作。
- 出勤規則：
  - 當日以上班第一筆、下班最後一筆作摘要。
  - 遲到依 `attendance_policy.work_start_time + grace_minutes` 判定。
  - `attendance_policy` 目前是全域單筆設定。
- 測試規則：
  - 既有測試依賴真實 DB schema。
  - 測試資料多用 `test-*.example.com` 命名並由 helper 清除。

## 7. Risky / Sensitive Areas

- 設定衝突待確認：
  - `.env.example` 與文件使用 `BACKEND_PORT`，但實際程式讀的是 `PORT`。
  - `VITE_API_URL` 預設為 `http://localhost:3001/api`，README 主要使用 `127.0.0.1:3001`；本機通常可共存，但需留意 CORS 與 host 混用。
- API/資料欄位風格敏感：
  - 前端直接依賴後端回傳的 `snake_case` 欄位；不要隨意改成 camelCase，除非同步全面調整。
- `backend/src/routes/index.js` 的建立使用者流程有可疑重複：
  - `issueSetupLink(user)` 被呼叫兩次。
  - 第一個呼叫在 `try/catch` 外，代表 email 失敗時 warning fallback 可能無法生效。
  - 修改此段前先確認預期行為。
- `users/repository.updateUser()` 使用 `COALESCE`：
  - 無法用 `null` 明確清空 `approver_user_id` / `delegate_user_id`。
  - 若要支援清空關聯，需要調整更新策略。
- 後端只有單一 `routes/index.js`：
  - 功能繼續擴張時很容易變大；新增 API 時注意不要讓 route 邏輯膨脹。
- Frontend 表單目前直接輸入 `approverUserId` / `delegateUserId`：
  - UX 粗糙但已成既有流程；若改成 picker，會影響多頁與測試假設。
- Email 發送：
  - 開發模式 `SMTP_HOST=mailhog` 時實際使用 `jsonTransport`，不是 Docker MailHog inbox。
  - 不要假設本機一定有可視化信箱。
- 測試覆蓋範圍有限：
  - 目前以 backend workflow 為主，UI 與更多 edge cases 尚未覆蓋。
- 待確認：
  - 是否要持續維持「前端直接輸入使用者 ID」的流程。
  - `attendance_policy` 未來是否仍維持全域單筆。
  - 加班核准後是否應自動累積補休。
  - 假別額度是否永遠手動 seed，而非依年資計算。

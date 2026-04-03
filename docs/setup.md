# 本機開發設定

## 執行方式

這個專案採用以下開發模式：

- `frontend`：本機執行 React + Vite
- `backend`：本機執行 Express
- `postgres`：使用 Docker 容器
- `pgadmin`：使用 Docker 容器

## 環境變數

請先將 `.env.example` 複製為 `.env`：

```bash
cp .env.example .env
```

常用環境變數如下：

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `DATABASE_URL`
- `BACKEND_PORT`
- `FRONTEND_PORT`
- `PGADMIN_PORT`
- `VITE_API_URL`
- `FRONTEND_URL`
- `FRONTEND_URLS`
- `JWT_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_NAME`

預設本機資料庫連線字串：

```bash
postgresql://attendance:attendance@localhost:5432/attendance
```

## 安裝依賴

```bash
npm install
npm install --workspace backend
npm install --workspace frontend
```

## 啟動資料庫服務

只啟動 PostgreSQL 與 pgAdmin：

```bash
npm run dev:db
```

啟動後可使用：

- PostgreSQL：`localhost:5432`
- pgAdmin：`http://localhost:5050`

停止資料庫服務：

```bash
npm run dev:db:stop
```

## 啟動後端

```bash
npm run migrate
npm run seed:admin
npm run dev:backend
```

說明：

- `npm run migrate`：建立或更新資料表
- `npm run seed:admin`：建立第一個管理者帳號
- `npm run dev:backend`：啟動本機後端開發伺服器
- 若 `.env` 的 `SMTP_HOST=mailhog`，本機開發會使用 mock email delivery，方便直接驗證密碼設定流程

後端健康檢查位址：

```bash
http://127.0.0.1:3001/health
```

## 啟動前端

請在另一個 terminal 執行：

```bash
npm run dev:frontend
```

前端位址：

```bash
http://127.0.0.1:5173
```

## 管理者帳號

執行以下指令後：

```bash
npm run seed:admin
```

預設會建立一組本機管理者帳號：

- Email：`admin@example.com`
- Password：`Admin123!`

可在 `.env` 中覆寫：

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_NAME`

## pgAdmin 登入資訊

打開：

```bash
http://localhost:5050
```

登入資訊：

- Email：`admin@example.com`
- Password：`admin`

如果你有修改 `.env`，請以這兩個值為準：

- `PGADMIN_DEFAULT_EMAIL`
- `PGADMIN_DEFAULT_PASSWORD`

## pgAdmin 內新增資料庫連線

在 pgAdmin 裡新增 Server 時，可使用以下資訊：

- Host：`postgres`
- Port：`5432`
- Database：`attendance`
- Username：`attendance`
- Password：`attendance`

如果你有修改 `.env`，請改成對應的：

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

## 補充說明

- 新建立的使用者預設走「設定密碼連結」流程。
- 系統目前支援 `admin`、`manager`、`employee` 三種角色。
- 補休與加班的自動換算目前保留擴充空間，尚未完全自動化。
- 若要正式測試寄信功能，還需要提供可用的 SMTP 服務。

# 出缺勤管理系統

這是一個使用 React、Express、PostgreSQL 建置的出缺勤管理系統 MVP。

本機開發模式如下：

- 前端：本機啟動
- 後端：本機啟動
- PostgreSQL：Docker 啟動
- pgAdmin：Docker 啟動

## 第一次啟動

1. 複製環境變數檔：

```bash
cp .env.example .env
```

2. 安裝依賴：

```bash
npm install
npm install --workspace backend
npm install --workspace frontend
```

3. 啟動資料庫與 pgAdmin：

```bash
npm run dev:db
```

4. 執行資料庫 migration：

```bash
npm run migrate
```

5. 建立第一個管理者帳號：

```bash
npm run seed:admin
```

6. 啟動後端：

```bash
npm run dev:backend
```

7. 另開一個 terminal 啟動前端：

```bash
npm run dev:frontend
```

補充：

- 本機開發時若 `.env` 的 `SMTP_HOST=mailhog`，後端會使用本機 mock email delivery。
- 因此建立使用者時仍可取得密碼設定連結，不需要真的有 SMTP 服務才能驗證 onboarding 流程。

## 本機網址

- 前端：`http://127.0.0.1:5173`
- 後端 API：`http://127.0.0.1:3001/api`
- 後端健康檢查：`http://127.0.0.1:3001/health`
- pgAdmin：`http://localhost:5050`

## 管理者登入帳號

執行以下指令後：

```bash
npm run seed:admin
```

預設會建立一組本機管理者帳號：

- Email：`admin@example.com`
- Password：`Admin123!`

如果要修改，可以在 `.env` 中覆寫：

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_NAME`

## pgAdmin 登入資訊

開啟 `http://localhost:5050` 後，使用以下資訊登入 pgAdmin：

- Email：`admin@example.com`
- Password：`admin`

如果要修改，可以在 `.env` 中調整：

- `PGADMIN_DEFAULT_EMAIL`
- `PGADMIN_DEFAULT_PASSWORD`

## PostgreSQL 連線資訊

本機資料庫預設連線資訊如下：

- Host：`localhost`
- Port：`5432`
- Database：`attendance`
- Username：`attendance`
- Password：`attendance`

對應的連線字串：

```bash
postgresql://attendance:attendance@localhost:5432/attendance
```

如果你是從 `pgAdmin` 容器內新增連線，Host 請填：

```bash
postgres
```

其餘資訊維持：

- Port：`5432`
- Database：`attendance`
- Username：`attendance`
- Password：`attendance`

## 常用指令

```bash
npm run dev:db
npm run dev:db:stop
npm run migrate
npm run seed:admin
npm run dev:backend
npm run dev:frontend
```

## 環境變數重點

常用的 `.env` 設定如下：

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `PGADMIN_DEFAULT_EMAIL`
- `PGADMIN_DEFAULT_PASSWORD`
- `DATABASE_URL`
- `VITE_API_URL`
- `FRONTEND_URL`
- `FRONTEND_URLS`
- `JWT_SECRET`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_NAME`

更完整的補充可參考 [docs/setup.md](/Users/lindingyuan/Documents/external_project/openspec-agent-skills-practice/docs/setup.md)。

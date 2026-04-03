## Why

現行出勤規則只支援當下打卡，且下班打卡必須以前一筆同日上班打卡為前提；一旦員工忘記打卡，就只能留下「未上班打卡」或無法下班打卡的結果，缺少補救流程。隨著出勤系統已具備主管審核與政策設定基礎，現在需要把忘打卡處理升級為可配置、可審核、可追溯的正式流程。

## What Changes

- 新增忘打卡補登申請流程，讓員工可補提上班或下班時間，並附上原因說明。
- 新增忘打卡處理規則設定，支援補登期限、是否需要主管審核、每月免審次數等彈性參數。
- 擴充每日出勤摘要，讓系統可同時呈現原始打卡狀態、補登後狀態與待審核狀態。
- 讓主管與管理者可查看、核准或拒絕忘打卡申請，並保留審核意見與稽核軌跡。
- 明確定義忘打卡與遲到判定、重複補登、跨日資料修正的互動方式。

## Capabilities

### New Capabilities
- `attendance-adjustment-requests`: 管理忘打卡補登申請、審核流程、狀態追蹤與稽核紀錄。

### Modified Capabilities
- `attendance-tracking`: 將既有出勤摘要從僅看原始打卡，擴充為可套用核准補登結果與彈性忘打卡規則。

## Impact

- Backend: `backend/src/modules/attendance/service.js`、`backend/src/routes/index.js` 需要新增補登申請與審核 API。
- Database: 需要新增忘打卡政策欄位與補登申請資料表/審核索引 migration。
- Frontend: `frontend/src/api.js`、`frontend/src/pages/AttendancePage.jsx` 與管理頁面需要新增申請、審核、狀態顯示與政策設定 UI。
- Specs: 新增 `attendance-adjustment-requests` 能力，並更新 `attendance-tracking` 規格。
- Open policy questions:
  - 每月免審次數用完後，是一律改為審核，還是直接拒絕申請。
  - 忘打卡補登是否只限最近 N 天，或允許管理者補開更長補登窗。
  - 核准後若造成遲到轉正常，是否需要標記為「補登正常」而非完全等同原始正常。

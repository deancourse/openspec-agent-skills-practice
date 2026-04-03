## Context

目前 MVP 的出勤資料只由 `attendance_records` 原始事件與單筆 `attendance_policy` 組成。系統可以計算當日第一筆上班、最後一筆下班與遲到狀態，但沒有補登流程；因此只要漏掉上班或下班打卡，使用者就無法透過正式機制修正結果，主管也沒有可追蹤的審核入口。

這次變更需要同時覆蓋三個面向：政策彈性、申請審核、出勤摘要重算。因為既有系統已依賴 immutable attendance event 模式，設計上應避免直接改寫 `attendance_records`，改以獨立的補登申請資料承載修正結果，並在查詢摘要時套用核准結果。

## Goals / Non-Goals

**Goals:**
- 讓員工可以對忘記上班或下班打卡的日期提出補登申請。
- 讓管理者可設定較彈性的忘打卡規則，例如補登期限、是否需審核、每月自動通過次數。
- 保留原始打卡紀錄不變，並在日摘要中以核准後的有效時間參與遲到與出勤狀態計算。
- 讓主管與管理者看得到申請狀態、審核結果與稽核軌跡。

**Non-Goals:**
- 不處理完整排班、跨班別、輪班或多時區出勤政策。
- 不在這次設計中導入多層級簽核。
- 不處理地點、IP、裝置指紋等進階打卡限制。
- 不將補登結果直接回寫成新的原始 `attendance_records` 事件。

## Decisions

### 1. 用獨立補登申請資料模型承載忘打卡修正

決定新增 `missed_punch_requests` 類型資料表，而不是修改 `attendance_records`。每筆申請至少包含 `user_id`、`work_date`、`missing_action`、`requested_time`、`reason`、`status`、`reviewer_user_id`、`review_comment`、`decided_at`，並保留建立與更新時間。

理由：
- 符合現有「原始事件不可變」模型，避免稽核混淆。
- 比把補登直接插成假事件更容易區分「原始打卡」與「人工修正」。
- 查詢層可以明確決定只套用 `approved` 的補登，而忽略 `pending` 或 `rejected`。

替代方案：
- 直接新增人工 `attendance_records` 事件：資料最少，但會混淆實際打卡與補登來源。
- 建立每日摘要快照表：讀取較快，但對目前 MVP 來說資料同步與重算成本過高。

### 2. 把彈性規則做成 attendance policy 擴充欄位

決定擴充 `attendance_policy`，加入忘打卡相關欄位，例如：
- `missed_punch_submission_days`
- `missed_punch_requires_approval`
- `missed_punch_auto_approve_quota`
- `missed_punch_allow_admin_override`

理由：
- 專案已經有單筆全域 `attendance_policy`，延伸既有模式最符合目前架構。
- 管理頁已存在出勤政策設定入口，能自然擴充 UI 與 API。
- 先採全域 policy 可降低 MVP 複雜度，未來若要做部門別政策再演進。

替代方案：
- 新增獨立 `missed_punch_policy` 表：語意較乾淨，但對現況沒有明顯必要。
- 直接寫死規則在 service：最快，但不符合使用者要的彈性。

### 3. 核准後只覆蓋「有效上下班時間」，不改動原始事件

決定在 `listAttendance` 與相關摘要邏輯中，先算出原始 `first_clock_in` / `last_clock_out`，再套用該日最新核准補登結果，得到 `effective_clock_in` / `effective_clock_out` 與 `adjustment_status`。

理由：
- 延續既有日摘要查詢模式，只需在查詢或 service 層加一層補登合併邏輯。
- 可以同時保留原始時間與修正後時間，讓 UI 顯示更透明。
- 遲到計算只需改成依 `effective_clock_in` 判斷。

替代方案：
- 核准時直接寫回每日摘要快取：查詢容易，但需要額外同步策略與回滾處理。

### 4. 自動通過只限低風險條件，其他走既有 approver 鏈

決定讓「彈性」主要來自分流而非完全放寬：若申請在期限內、該日確實缺少對應打卡、且員工當月尚有自動通過額度，系統可直接核准；否則送交 `approver_user_id`，若無主管則由管理者處理。

理由：
- 能滿足常見忘打卡補救需求，又不會讓規則失控。
- 可重用既有使用者主管關係，避免再建一套審核指派規則。
- 與 leave/overtime 的單層審核心智模型一致。

替代方案：
- 全部自動通過：操作最簡單，但濫用風險高。
- 全部人工審核：最保守，但缺乏使用者想要的彈性。

### 5. 前端先整合在既有 Attendance 與 Admin 頁面

決定員工端先在 `frontend/src/pages/AttendancePage.jsx` 增加「補登申請」入口、每日日摘要狀態與申請列表；管理端則在現有管理頁增加政策設定與待審清單，而不另外拆新路由。

理由：
- 符合 MVP 與現有前端結構，改動範圍可控。
- 使用者看出勤與補登屬於同一工作流，放同頁較直覺。

替代方案：
- 新增完整補登中心頁面：擴充性較高，但對目前需求過重。

## Risks / Trade-offs

- [補登判斷與原始摘要合併邏輯變複雜] → 以 service 層明確區分 raw/effective 欄位，並補上整合測試。
- [政策欄位增加後，舊資料與 API 回傳格式會變動] → migration 提供預設值，前端先對缺少新欄位做 fallback。
- [自動通過機制可能被濫用] → 加入每月額度、期限限制與完整 audit trail。
- [同一日多筆申請可能互相衝突] → 限制同一員工同一日期同一缺失類型只能有一筆 pending request。
- [主管不存在或人員異動造成審核卡住] → 允許 admin 查詢並接手審核，服務端在指派時回退到 admin。

## Migration Plan

1. 新增 migration，擴充 `attendance_policy` 欄位並建立補登申請資料表與必要索引。
2. 擴充 backend attendance 模組與 route，加入申請建立、列表、審核、policy 更新與 effective summary 計算。
3. 更新前端 API 與出勤/管理頁面，顯示補登狀態、申請入口與待審清單。
4. 補上 `node:test` 整合測試，涵蓋期限、自動通過、人工審核、摘要重算與權限控管。
5. 若需要回滾，可先停止前端入口並回退 backend route；資料表可保留但不再讀取，不需回寫原始事件。

## Open Questions

- 每月自動通過額度是否要區分上班漏打與下班漏打，還是共用一個 quota。
- 若員工當天完全沒有打卡，是否允許同時提交上班與下班兩筆補登，或必須拆成兩筆申請。
- 對「明顯錯誤」有效邊界的定義是否只限缺卡，還是也包含誤按造成極端時間。

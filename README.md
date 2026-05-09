# MeetWhen

> 智慧會議時間協調工具 — 一個比 When2Meet 更聰明的多人時間配對 Web App。

支援三種輸入方式：**手動點選**、**AI 課表辨識**、**中文自然語言**。三種輸入正規化到同一份 availability 模型後，演算法會根據人數動態調整出席門檻，找出最佳開會時段。

---

## ✨ 核心功能

### 1. 三種輸入方式，融合到同一份資料模型

| 方式 | 適合 | 實作 |
|---|---|---|
| **手動點選** | 已知具體有空時段 | Drag-select grid，支援 touch / mouse |
| **AI 課表辨識** | 學生上傳課表截圖 | Gemini 2.5 Flash 多模態 API → 結構化忙碌時段 |
| **中文文字輸入** | 「下週三下午有空」 | 自寫 NLP parser 處理中文時間描述 |

三種輸入結果都正規化為 `(date, startTime, endTime, status)` slot，前端用同一個 `<HeatmapGrid>` 元件渲染。

### 2. 自適應推薦演算法

不是單純取交集，而是依人數動態調整門檻：

| 人數 | 出席要求 |
|---|---|
| ≤ 3 | 全到 |
| 4–8 | 最多缺 2 |
| 9–11 | 最多缺 3 |
| ≥ 12 | 過半 |

合併連續 slot 後找出最長可開時段，回傳 top-K 候選 + 每個候選的「全可 / 部分可 / 不能到」名單。

### 3. 互動式熱力圖

- View 模式：11 級熱度色階 + 「最佳時段」/「人數」切換
- Edit 模式：別人的可用度當灰階底圖，使用者選擇用半透明覆蓋 — 既能看到熱度，又能看到自己的選擇
- Hover/tap tooltip 顯示有空 / 缺席名單

---

## 🛠 技術棧

- **Frontend**：Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS v4
- **Backend**：Next.js API Routes / Server Actions
- **Database**：Prisma ORM · SQLite (本地) / Turso (Production)
- **AI**：Google Gemini 2.5 Flash (多模態課表辨識)
- **Testing**：Vitest

---

## 🏗 架構

```
src/
├── app/                     # Next.js App Router
│   ├── api/                 #   API routes (REST)
│   ├── event/[id]/          #   活動主頁 (heatmap + 推薦)
│   ├── event/[id]/join/     #   參與者填寫頁
│   └── page.tsx             #   建立活動表單
├── components/              # React UI
│   ├── HeatmapGrid.tsx      #   View / Edit 雙模式熱力圖
│   ├── DatePicker.tsx
│   ├── ScheduleUploader.tsx #   課表圖片上傳
│   └── TextInput.tsx        #   中文 NLP 輸入
├── lib/                     # Pure logic (無 I/O，可獨立測試)
│   ├── scheduler.ts         #   時段合併與最佳化
│   ├── nlpParser.ts         #   中文時間解析
│   └── viewData.ts
└── server/
    ├── db/                  # Prisma 資料層
    ├── services/            # 商業邏輯 (含單元測試)
    └── visionParser.ts      # Gemini API 整合
```

**設計原則**：
- `app/` → `services/` → `db/` 三層分離，UI 與資料層解耦
- Pure logic 獨立成 `lib/` 可不靠 mock 直接測試
- TypeScript strict mode 全開

---

## 📊 Data Model

```
Event ──< Participant ──< Availability
```

```prisma
model Event {
  id           String   @id @default(cuid())
  title        String
  dates        String   // JSON array ["2026-04-15", ...]
  startTime    String   // "HH:MM"
  endTime      String   // "HH:MM"
  slotDuration Int      // 預設 30 分鐘
  participants Participant[]
}
```

時間格式統一為 `"HH:MM"` 24 小時，區間 `[start, end)` end-exclusive。

---

## 🚀 本地開發

```bash
# 1. 安裝套件
npm install

# 2. 設定環境變數
cp .env.example .env
# 編輯 .env，填入 GEMINI_API_KEY (課表辨識需要)

# 3. 初始化資料庫
npx prisma migrate dev

# 4. 啟動開發伺服器
npm run dev
```

開啟 http://localhost:3000

### 測試

```bash
npm test            # watch 模式
npm run test:run    # 跑一次
npm run test:cov    # 含 coverage
```

---

## 🔑 環境變數

| 變數 | 必要 | 用途 |
|---|---|---|
| `GEMINI_API_KEY` | 是 | Google Gemini API（課表圖片辨識） |
| `DATABASE_URL` | 本地 | SQLite，預設 `file:./dev.db` |
| `TURSO_DATABASE_URL` | Production | Turso (libSQL) URL |
| `TURSO_AUTH_TOKEN` | Production | Turso 驗證 token |

申請 Gemini API key：https://aistudio.google.com/apikey

---

## 📡 API

| Method | Path | 說明 |
|---|---|---|
| POST | `/api/events` | 建立活動 |
| GET | `/api/events/[id]` | 取得活動 + 所有 availability |
| POST | `/api/events/[id]/join` | 加入活動 |
| PUT | `/api/events/[id]/availability` | 更新 availability |
| GET | `/api/events/[id]/suggest` | 最佳時段推薦 |
| POST | `/api/parse-schedule` | 課表圖片 → Gemini 解析 |
| POST | `/api/parse-text` | 中文文字 → 時間區間解析 |


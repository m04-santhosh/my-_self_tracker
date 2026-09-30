# LifeOS 90

**LifeOS 90** is a calm, focused, single-user personal operating system designed for **Santhosh** to execute and reflect during a 90-day journey running from **October 1, 2026 to December 31, 2026 (92 days)**.

Core Loop:
```
PLAN  ➔  SCHEDULE  ➔  REMIND  ➔  EXECUTE  ➔  REVIEW  ➔  STORE  ➔  COMPARE  ➔  IMPROVE
```

---

## 1. Quick Start

### Option A: One-Click Startup Script (Windows)
Double-click or run:
```cmd
start.bat
```
*(Or `./start.sh` if using Linux / macOS / Git Bash)*

### Option B: Two-Terminal Run (Recommended for Development)

**Terminal 1 — Backend (FastAPI)**:
```bash
# In the workspace root
.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

**Terminal 2 — Frontend (Vite + React)**:
```bash
cd frontend
npm run dev
```

Open your browser at:
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **API Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 2. Seed Data & Initial Setup

> [!IMPORTANT]
> **Edit Seed Templates**: Default editable schedule templates and 4 starter goals (with zero progress) are initialized on first startup. You should personalize your schedule anytime on the **Schedule** page (`/schedule`).

### Seeded Defaults:
- **Editable Schedule Templates**:
  - `06:30` Wake Up (Discipline, Checkpoint, wake role)
  - `07:00 – 07:45` Walking (Body, exercise, ask on end)
  - `08:00 – 08:30` Breakfast (Body)
  - `09:00 – 16:00` College (Career, Mon–Fri)
  - `18:00 – 19:00` DSA (Career, focus, tracks "problems", ask on end)
  - `19:30 – 20:45` Project Work (Career, focus, ask on end)
  - `21:00 – 21:30` Dinner (Body)
  - `21:30 – 21:40` Log Expenses (Money)
  - `22:00 – 22:15` Daily Review (Discipline)
  - `23:00` Sleep (Discipline, Checkpoint, bedtime role)
- **Starter Goals (Zero Progress)**:
  1. *Complete 150 DSA problems* (Linked to DSA template, unit: problems)
  2. *90 days of movement* (Linked to Walking template, target: 90 days)
  3. *Earn Rs 10,000 independently* (Freelancing & business income, target: 10,00,000 paise)
  4. *Show up for the 92-day challenge* (Days logged, target: 92 days)
- **No Fake Data Policy**:
  - Zero fake history, zero fake completions, zero fake transactions.
  - All charts and stats start clean and genuine.

---

## 3. Architecture & Domain Rules

### A. Template Snapshot vs Instance
- `activity_templates`: Defines your recurring rhythm.
- `activity_instances`: Real activities for a specific date. When an instance is created, it **copies (snapshots)** planned times, titles, categories, and metrics.
- Past instances never alter when a template is changed.
- Single-day adjustments (e.g. moving today's DSA from 6 PM to 8 PM) sets `overridden = true` on the instance and preserves the recurring template.

### B. Future-Only Syncing (`services/scheduler.py`)
- Editing a template (`PATCH /api/templates/{id}`) applies **strictly to future pending non-overridden instances** (`date >= today`, `status == pending`, `overridden == false`).
- Logged activities and custom overrides are never touched.
- Changing `days_of_week` deletes mismatched future pending instances and generates new ones up to the horizon.
- Pausing a template prunes future pending instances; resuming regenerates them.

### C. Scoring & Consistency
- **Day Score** (past or closed days):
  $$\text{Score} = \text{round}\left( \frac{\text{Completed} + 0.5 \times \text{Partial}}{\text{Completed} + \text{Partial} + \text{Missed}} \times 100 \right)$$
  *(Skipped items and unlogged items are excluded from the denominator)*
- **Live Progress**: Live progress includes pending items to reflect real-time daytime status.
- **Rest Days**: Marked via `is_rest_day = true`. Rest days are neutral: excluded from scoring, do not break streaks, and are never counted as success or failure.
- **Streaks & Resilience**:
  - Successful day: `score >= success_threshold` (default 70%) and not a rest day.
  - Missing a day does not reset your identity. The system factually tracks **Bounce-Back Rate** (how often you succeed immediately after a non-successful day) and **Never Missed Twice** count.

### D. Goals Engine (Computed Progress)
Goal progress is **computed on-demand** from SQLite data:
- `activity_metric_sum`: Sum of `metric_value` on logged instances of the linked template.
- `activity_completion_count`: Count of `completed` instances of the linked template.
- `income_sum`: Sum of income transactions within the goal window.
- `days_logged`: Distinct days with logged activities or daily reviews.
- `successful_days`: Count of days meeting the success threshold.
- `manual`: Sum of user-added `goal_entries`.
- Shows neutral pace guidance ("needs about 1.6/day"), never judgmental.

### E. Finance (Paise Arithmetic)
- Stored internally as integer paise (`amount_paise`) to prevent floating-point rounding errors.
- Displayed with standard Indian grouping: `Rs 1,25,000`.
- Termed **"Net" / "Net Rate"** (Income minus Expenses), not "savings".

### F. Browser Reminders & Sleep Tracking
- Uses the standard HTML5 `Notification` API with quiet hours (`23:30` to `06:00`).
- Prevents notification storming: If a laptop was in sleep mode, stale reminders do not burst-fire; instead, a calm in-app banner ("You missed N reminders") appears.
- Sleep hours for date $D$ are computed automatically as:
  $$\text{Sleep Hours}(D) = \text{Wake}(D).\text{actual\_start} - \text{Bedtime}(D-1).\text{actual\_start}$$

---

## 4. Tech Stack

- **Backend**: Python 3.10+, FastAPI, Pydantic v2, SQLAlchemy 2.0, uvicorn
- **Database**: SQLite file at `database/lifeos.db` with `PRAGMA foreign_keys=ON` and `PRAGMA journal_mode=WAL`
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, React Router v7, Recharts, Lucide React
- **Testing**: `pytest` (backend), `vitest` (frontend unit tests)

---

## 5. Verification & Tests

### Backend Tests (pytest)
```bash
.venv\Scripts\python.exe -m pytest backend/tests
```
Verifies:
- Template generation idempotency
- Future-only sync on template updates
- Safe pruning on template pause
- Score formula & neutral rest days
- Automatic goal progress updates
- Sleep duration arithmetic
- Comparison engine

### Frontend Tests (Vitest)
```bash
cd frontend
npm run test
```
Verifies schedule status logic (`current`, `next`, `overdue`, countdowns).

### Automated Smoke Test
```bash
.venv\Scripts\python.exe backend/scripts/smoke_test.py
```
Validates the full end-to-end flow with real HTTP requests against the FastAPI app.

---

## 6. Project Layout

```
LifeOS-90/
├── README.md
├── start.bat / start.sh
├── database/
│   ├── lifeos.db (runtime)
│   └── backups/
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py, config.py
│   │   ├── database/ (engine, session, init_db, seed)
│   │   ├── models/ (settings, activity, review, goal, finance)
│   │   ├── schemas/ (common, activity, review, goal, finance, analytics, compare)
│   │   ├── services/ (scheduler, scoring, goals, finance, analytics, compare, notifications)
│   │   └── routers/ (templates, instances, days, goals, finance, analytics, compare, settings, notifications, system)
│   ├── tests/ (conftest, test_scheduler, test_scoring, test_api_milestone1, test_milestone2)
│   └── scripts/ (smoke_test.py)
```

---

## 7. Mobile Experience & Phone Access

LifeOS 90 is designed for a phone-first daily workflow so you can carry it in your pocket throughout the 90 days.

### Mobile Features
1. **Ergonomic Bottom Navigation**:
   - Fixed bottom tab bar with thumb-accessible primary actions: Today, Schedule, History, Finance, and "More".
   - Slide-up navigation drawer for Goals, Compare, Analytics, and Settings.
2. **Native-Like Bottom Sheets**:
   - Quick Log, One-Off Tasks, Schedule Templates, and Goals open as slide-up bottom sheets with touch drag handles rather than desktop-centered popups.
   - Large, thumb-friendly touch targets (min 44px) for Done, Partial, Missed, and Skip statuses.
3. **Optimized Form Controls**:
   - Amount and metric number fields use `inputMode="decimal"` to invoke the numeric keypad automatically on iOS and Android.
   - Schedule page features a horizontal scrollable day-pill selector (`Mon` to `Sun`) on phone viewports instead of squishing a 7-column table.
4. **Touch & Inset Polish**:
   - Full support for notch and home bar safe areas (`pb-safe`, `pt-safe`).
   - Double-tap zoom delay disabled via `touch-action: manipulation` for instant responsive button taps.

### How to Open on Your Mobile Phone
1. Connect your phone and PC to the same Wi-Fi network.
2. Run `start.bat` (Windows) or `./start.sh` (Mac/Linux). Both uvicorn and Vite bind to `0.0.0.0`.
3. Note your PC's local IP address (e.g., `192.168.1.X` displayed by Vite or via `ipconfig` / `ifconfig`).
4. On your mobile browser (Safari, Chrome, etc.), visit:
   ```
   http://192.168.1.X:5173
   ```
5. *(Optional)* Tap **Share / Options -> Add to Home Screen** on your phone to run LifeOS 90 like a standalone native app!
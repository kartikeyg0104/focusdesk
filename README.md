# FocusDesk

FocusDesk is a local-first desktop app for students: tasks, a calendar, a Pomodoro focus timer, notes, and study insights in one window. Everything is stored on the machine that runs it. There is no account, no cloud database, and no paid API.

## Run it

```bash
npm install
```

```bash
npm start
```

`npm start` builds the interface and opens the app. It works the same on macOS, Windows, and Linux.

While developing, use hot reload instead:

```bash
npm run dev
```

## What it does

**Tasks**
- One-line quick add that understands plain text: `Lab report fri !high #chem @math 45m` sets the due date, priority, tag, subject, and estimate.
- Subtasks with progress, tags, priorities, estimates, and due dates.
- List view grouped by deadline (Overdue, Today, Tomorrow, This week, Later) and a drag-and-drop board (To do, In progress, Done).
- Undo for completing and deleting.

**Calendar**
- Month view of deadlines, colored by subject, with focus time per day. Double-click a day to add a task for it.

**Focus timer**
- Timestamp-based Pomodoro timer that does not drift and survives restarts.
- Focus, short break, and long break phases, presets (25/5, 50/10, 90/15), +5 minutes, and optional auto-start of the next block.
- Zen mode for a distraction-free full-window timer.
- Ambient sound (rain, brown noise, white noise) and completion chimes, generated in the app, so nothing is downloaded.
- Link a block to a task and tick off its subtasks while you work.

**Notes**
- Notes that save as you type, with pinning, search, and an optional subject.

**Insights**
- Daily goal ring and study streaks.
- Focus time for the last 7 or 30 days against your goal, time by subject, a 20-week consistency heatmap, and time-of-day breakdown.
- Filterable session history.

**Everything else**
- Command palette (`Ctrl/Cmd K`) to search tasks and notes and run any action.
- Dark, light, and system themes with five accent colors, and a reduce-motion switch.
- Desktop notifications for finished blocks, deadlines, and the daily goal.
- JSON backup and restore, plus CSV export of tasks and sessions.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd K` | Search and commands |
| `Ctrl/Cmd N` | New task |
| `Ctrl/Cmd 1` to `7` | Jump between pages |
| `Ctrl/Cmd ,` | Settings |
| `Ctrl/Cmd B` | Collapse the sidebar |
| `Space` | Start, pause, or resume the timer |
| `Esc` | Close a dialog or leave zen mode |

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Build the renderer and launch the app |
| `npm run dev` | Vite dev server with hot reload, plus Electron |
| `npm test` | Unit and integration tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run build` | Build the renderer into `dist/` |
| `npm run package` | Build an unpacked app into `release/` with electron-builder |

## Where data lives

Data is stored as JSON in the Electron user-data folder (the exact path is shown under Settings, Your data), not in the project directory:

- `tasks.json`, `subjects.json`, `sessions.json`, `notes.json`, `settings.json`

Writes are atomic (temp file, then rename). If a file is damaged, FocusDesk leaves it in place, saves a `.corrupt-…` copy, and lets you reset just that section. Restoring a backup first writes a `pre-restore-…json` copy of your current data.

## Project layout

```
electron/        Main process: window, IPC handlers, JSON storage, notifications, menu
lib/             Shared logic used by the main process (validation, timer, statistics, export)
src/             React renderer
  components/    Reusable UI (task rows, board, charts, dialogs, command palette)
  pages/         Dashboard, Tasks, Calendar, Focus, Notes, Subjects, Insights, Settings
  hooks/         Data hooks, the timer, and sound
  styles/        Design tokens and styles
  utils/         Renderer copies of date, timer, and statistics helpers; quick-add parser
scripts/         Cross-platform Electron launcher
tests/           Vitest unit and integration tests
```

The renderer runs sandboxed with context isolation. It can only reach the main process through the small API exposed in `electron/preload.js`.

## Requirements

- Node.js 18 or newer
- macOS, Windows, or Linux

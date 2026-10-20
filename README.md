# FocusDesk

FocusDesk is a local-first desktop app for college students. It keeps assignments, subjects, Pomodoro sessions, and study statistics on the machine that runs it. There is no account, no cloud database, and no paid API.

## What it does

- Organize assignments with priority, status, due dates, and estimates
- Group work by subject without deleting tasks when a subject is removed
- Run a timestamp-based Pomodoro timer that does not drift with `setInterval`
- Record completed and interrupted focus sessions exactly once
- Show a dashboard and statistics from real saved data
- Send desktop notifications for session boundaries, deadlines, and the daily study goal
- Export JSON backups plus CSV files for tasks and sessions
- Restore a backup only after validating it and writing a pre-restore copy

## Main features

- Dashboard with today's priorities, overdue work, upcoming deadlines, and weekly study time
- Task CRUD, filters, sorting, and reopen for completed items
- Subject CRUD with color labels
- Focus, short-break, and long-break timer
- Statistics for today, this week, this month, and time by subject
- Dark and light themes
- Keyboard shortcuts and desktop notifications
- JSON persistence in the Electron user-data folder

## Technology

- Electron for the desktop shell
- React 18 for the renderer
- Vite for development and production bundling
- JavaScript and JSX
- Node.js filesystem APIs for JSON persistence
- Vitest for unit and integration tests
- electron-builder for packaging

## Prerequisites

- Node.js 18 or newer
- npm 9 or newer
- macOS, Windows, or Linux

## Install

```bash
cd Desktop-app
npm install
```

## Development

```bash
npm run dev
```

This starts the Vite renderer on `http://127.0.0.1:5173` and then launches Electron. The window loads that local URL only in development.

If you launch from an environment that sets `ELECTRON_RUN_AS_NODE=1` (some editor terminals do), the npm scripts unset that variable so Electron starts as a desktop app instead of a plain Node process.

Launch the already-built renderer through Electron:

```bash
npm run start
```

## Tests, lint, and build

```bash
npm test
npm run lint
npm run build
```

Watch mode:

```bash
npm run test:watch
```

The suite covers validation, filters, date boundaries, Pomodoro transitions, statistics, settings, malformed JSON handling, failed writes, invalid imports, persistence across reloads, export/import, IPC handlers, and preload listener cleanup. It does not launch a visible Electron window.

## Packaging

```bash
npm run package
```

This builds the renderer, then runs `electron-builder --dir`. The packaged app is an unpacked directory in `release/`, not a signed installer.

On Apple silicon macOS the binary is typically:

```text
release/mac-arm64/FocusDesk.app
```

The packaged app includes `electron/`, `lib/`, `dist/`, and `package.json`. It loads `dist/index.html` instead of the Vite server.

Code signing, notarization, Windows installers, and Linux installers are not part of this configuration.

## Folder structure

```text
electron/          Main process, preload, IPC, filesystem services
lib/               Shared, testable business logic with no Electron dependency
src/               React renderer
tests/unit         Pure logic and storage tests
tests/integration  Store reload, export, and IPC tests
```

## Architecture

FocusDesk uses three layers.

**Main process (`electron/`)**  
Creates the window, owns the filesystem, validates every write, schedules notifications, and registers keyboard menu commands. The renderer never reads or writes JSON files itself.

**Preload (`electron/preload.js`)**  
Exposes a small `window.focusDesk` API through `contextBridge`. It does not expose `ipcRenderer`, filesystem paths as APIs, or shell access. Event listeners return unsubscribe functions.

**Renderer (`src/`)**  
Renders the workspace, keeps transient UI state, and calls `desktopApi`. Navigation happens in React. The Pomodoro hook lives at the app root so changing pages does not create a second timer.

### How a task is saved

1. The form in React calls `desktopApi.tasks.create(payload)`.
2. Preload forwards that as `ipcRenderer.invoke('tasks:create', payload)`.
3. The main-process handler validates the payload.
4. `FocusDeskStore` assigns an id, writes `tasks.json` atomically, and returns the saved task.
5. React updates local state only after that result arrives.

If the write fails, the in-memory cache is rolled back, the UI shows an error toast, and FocusDesk does not claim the save succeeded.

## Local data

Files live in the Electron user-data directory, inside a `data` folder:

- `tasks.json`
- `subjects.json`
- `sessions.json`
- `settings.json`

On macOS that is typically `~/Library/Application Support/focusdesk/data`.

Writes use a temporary file and rename. If a file is malformed, FocusDesk copies it to a `*.corrupt-*.json` backup, leaves the original in place, and asks you to recover. It does not silently replace damaged data with an empty file.

### Backup and restore

- **Export JSON** writes a FocusDesk backup to a file you choose. The live database is not modified.
- **Export CSV** writes tasks or sessions to a CSV file you choose.
- **Restore** asks for confirmation, validates the selected file, writes a `pre-restore-*.json` copy next to the user-data folder, then replaces tasks, subjects, sessions, and settings.
- An invalid import is rejected before any live data is replaced.
- If restore writes fail partway through, FocusDesk rolls the in-memory cache back and attempts to rewrite the previous files.

### Timer policy

The timer stores `endsAt` and calculates remaining time from the clock. Paused time is not study time. If the app quits during a running session, the next launch restores that session as paused from the last persisted remaining time. Closed time is not counted as focus. Reset and skip store an interrupted session when some time actually elapsed. Skip does not count toward the long-break interval. Break duration is stored but never added to study totals. Completed sessions use a `completionId` so the same finish cannot be saved twice.

### Subject deletion policy

Deleting a subject keeps the related tasks and clears `subjectId`. The UI asks before that happens.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| Cmd/Ctrl N | New task, unless a text field is focused |
| Cmd/Ctrl K | Quick search |
| Cmd/Ctrl , | Settings |
| Space | Pause or resume the timer when you are not typing |
| Esc | Close the active dialog |

## Troubleshooting

**The window is blank in development**  
Confirm port 5173 is free and that `npm run dev` started both Vite and Electron.

**Notifications do not appear**  
macOS and Windows can block them until the OS permission is granted. FocusDesk still records the session.

**A data file will not load**  
Open Settings to see the storage path, then use Recover in the banner. The damaged copy stays on disk.

**`npm run package` is slow or skipped**  
Packaging downloads Electron binaries. The renderer production build can still be verified with `npm run build`.

## Known limitations

- Full window-level end-to-end tests are not part of the automated suite.
- Notifications cannot fire after the app has quit.
- Import replaces the current database after writing a backup. There is no merge mode.
- The packaged artifact is an unpacked directory (`--dir`), not a signed installer.
- Code signing, notarization, Windows packaging, and Linux packaging have not been performed unless you run those platform targets yourself.
- Renderer business helpers in `src/utils/` are kept in sync with `lib/` by convention. Automated tests cover `lib/`.

## Manual checks still worth doing

1. Create, edit, complete, reopen, and delete a task, then quit and reopen the app.
2. Delete a subject that still has tasks and confirm the tasks remain unassigned.
3. Start a focus session, pause it, wait, resume, then complete a short break.
4. Quit while a session is running and confirm it restores paused, without adding closed time.
5. Export a backup, change data, restore the backup, and try restoring a broken JSON file.
6. Toggle the theme, quit, and confirm the theme is still applied.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite + Electron |
| `npm run start` | Launch Electron against the current files |
| `npm run build` | Production renderer |
| `npm test` | Vitest |
| `npm run lint` | ESLint |
| `npm run package` | Build renderer and package the desktop app |

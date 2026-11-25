// Starts Electron in a way that works the same on macOS, Windows, and Linux.
// Some editor terminals export ELECTRON_RUN_AS_NODE=1, which makes Electron
// behave like plain Node, so it is removed here instead of with `env -u`
// (which does not exist on Windows).
const { spawn } = require('node:child_process');
const path = require('node:path');

const electronBinary = require('electron');
const dev = process.argv.includes('--dev');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
if (dev) env.FOCUSDESK_DEV = '1';
else delete env.FOCUSDESK_DEV;

const child = spawn(electronBinary, [path.join(__dirname, '..')], { stdio: 'inherit', env });
child.on('close', (code) => process.exit(code ?? 0));

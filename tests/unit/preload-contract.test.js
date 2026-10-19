import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('preload contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'electron/preload.js'), 'utf8');

  it('exposes only the focusDesk bridge', () => {
    expect(source).toContain('contextBridge.exposeInMainWorld(\'focusDesk\'');
    expect(source).not.toContain('exposeInMainWorld(\'ipcRenderer\'');
    expect(source).not.toContain('window.ipcRenderer');
  });

  it('does not give the renderer unrestricted ipc or filesystem access', () => {
    expect(source).not.toContain('exposeInMainWorld(\'ipcRenderer\'');
    expect(source).not.toContain('ipcRenderer: ipcRenderer');
    expect(source).not.toMatch(/require\(['"]fs['"]\)/);
    expect(source).not.toMatch(/require\(['"]child_process['"]\)/);
  });

  it('returns cleanup functions for event listeners', () => {
    expect(source).toContain("ipcRenderer.on('app:navigate'");
    expect(source).toContain("ipcRenderer.on('app:command'");
    expect(source).toContain("ipcRenderer.removeListener('app:navigate'");
    expect(source).toContain("ipcRenderer.removeListener('app:command'");
  });
});

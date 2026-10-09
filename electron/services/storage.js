const fs = require('node:fs/promises');
const path = require('node:path');
const { AppError } = require('../../lib/errors');

class JsonStore {
  constructor({ dataDir, fsImpl = fs } = {}) {
    if (!dataDir) {
      throw new Error('JsonStore requires a data directory.');
    }
    this.dataDir = dataDir;
    this.fs = fsImpl;
    this.queues = new Map();
  }

  filePath(name) {
    return path.join(this.dataDir, `${name}.json`);
  }

  async ensureDir() {
    await this.fs.mkdir(this.dataDir, { recursive: true });
  }

  async enqueue(name, work) {
    const previous = this.queues.get(name) || Promise.resolve();
    const next = previous.catch(() => {}).then(work);
    this.queues.set(name, next);
    return next;
  }

  async readRaw(name) {
    await this.ensureDir();
    const file = this.filePath(name);
    try {
      return await this.fs.readFile(file, 'utf8');
    } catch (error) {
      if (error && error.code === 'ENOENT') return null;
      throw new AppError('STORAGE_READ', `Could not read ${name} data.`, { name });
    }
  }

  async parseOrRecover(name, raw) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.dataDir, `${name}.corrupt-${stamp}.json`);
      try {
        await this.fs.writeFile(backupPath, raw, 'utf8');
      } catch (_backupError) {
        // Keep the original error if the backup copy fails.
      }
      throw new AppError(
        'MALFORMED_DATA',
        `${name} data is damaged and was not overwritten. A backup copy was saved.`,
        { name, backupFile: path.basename(backupPath) }
      );
    }
  }

  async load(name, fallback) {
    return this.enqueue(name, async () => {
      const raw = await this.readRaw(name);
      if (raw === null) {
        await this.writeAtomic(name, fallback);
        return { data: fallback, created: true };
      }
      const data = await this.parseOrRecover(name, raw);
      return { data, created: false };
    });
  }

  async writeAtomic(name, data) {
    await this.ensureDir();
    const file = this.filePath(name);
    const temp = `${file}.${process.pid}.tmp`;
    const payload = `${JSON.stringify(data, null, 2)}\n`;
    try {
      await this.fs.writeFile(temp, payload, 'utf8');
      await this.fs.rename(temp, file);
    } catch (error) {
      try {
        await this.fs.unlink(temp);
      } catch (_cleanupError) {
        // Ignore cleanup errors.
      }
      throw new AppError('STORAGE_WRITE', `Could not save ${name} data.`, { name });
    }
  }

  async save(name, data) {
    return this.enqueue(name, () => this.writeAtomic(name, data));
  }
}

module.exports = { JsonStore };

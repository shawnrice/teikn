import fs from 'node:fs';
import path from 'node:path';

export const ensureDirectory = async (dirPath: string): Promise<void> => {
  const dir = path.resolve(dirPath);

  try {
    await fs.promises.access(dir);

    return Promise.resolve();
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      // Surface the real failure (EACCES, ENOTDIR, …) instead of rejecting with
      // `undefined`, which reaches the caller as an undiagnosable error.
      return Promise.reject(error);
    }

    try {
      await fs.promises.mkdir(dir, { mode: 0o755, recursive: true });

      return Promise.resolve();
    } catch (e: unknown) {
      return Promise.reject(e);
    }
  }
};

export default ensureDirectory;

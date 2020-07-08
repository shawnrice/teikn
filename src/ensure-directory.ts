import fs from 'fs';
import path from 'path';

export const ensureDirectory = async (dirPath: string): Promise<void> => {
  const dir = path.resolve(dirPath);
  try {
    await fs.promises.access(dir);
    return Promise.resolve();
  } catch (err) {
    if (err.code !== 'ENOENT') {
      return Promise.reject();
    }

    try {
      await fs.promises.mkdir(dir, { mode: 0o755, recursive: true });
      console.log(`Created ${dir}.`);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }
};

export default ensureDirectory;

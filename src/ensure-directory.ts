import fs from 'fs';
import path from 'path';

export const ensureDirectory = (dirPath: string): Promise<boolean> =>
  new Promise(async (res, rej) => {
    const dir = path.resolve(dirPath);
    try {
      await fs.promises.access(dir);
      res();
    } catch (err) {
      if (err.code !== 'ENOENT') {
        rej(err);
      }

      try {
        await fs.promises.mkdir(dir, { mode: 0o755, recursive: true });
        console.log(`Created ${dir}.`);
        return res();
      } catch (error) {
        rej(error);
      }
    }
  });

export default ensureDirectory;

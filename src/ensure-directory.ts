import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';

export const ensureDirectory = (dirPath: string): Promise<boolean> =>
  new Promise((res, rej) => {
    const dir = path.resolve(dirPath);
    try {
      fs.accessSync(dir);
      return res(true);
    } catch (error) {
      const { code } = error;
      if (code === 'ENOENT') {
        // The directory does not exist
        mkdirp(dir, { mode: 0o755 & ~process.umask(0o755) })
          .then(err => {
            if (err) {
              return rej(err);
            }

            console.log(`Created ${dir}.`);
            return res(true);
          })
          .catch(error => {
            rej(error);
          });
      } else {
        return rej(error);
      }
    }
  });

export default ensureDirectory;

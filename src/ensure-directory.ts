import fs from "node:fs";
import path from "node:path";

export const ensureDirectory = async (dirPath: string): Promise<void> => {
  const dir = path.resolve(dirPath);
  try {
    await fs.promises.access(dir);
    return Promise.resolve();
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      return Promise.reject();
    }

    try {
      await fs.promises.mkdir(dir, { mode: 0o755, recursive: true });
      console.log(`Created ${dir}.`);
      return Promise.resolve();
    } catch (e: unknown) {
      return Promise.reject(e);
    }
  }
};

export default ensureDirectory;

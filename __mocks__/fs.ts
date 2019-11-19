import path from 'path';

interface PartiallyMockedFS {
  __setMockFiles: typeof __setMockFiles;
  accessSync:
}

const fs = jest.genMockFromModule<PartiallyMockedFS>('fs');


let mockFiles = Object.create(null);

function __setMockFiles(newMockFiles: { [key: string]: string }) {
  mockFiles = Object.create(null);
  for (const file in newMockFiles) {
    const dir = path.dirname(file);

    if (!mockFiles[dir]) {
      mockFiles[dir] = [];
    }
    mockFiles[dir].push(path.basename(file));
  }
}

function accessSync(filepath: string) {

}

// A custom version of `readdirSync` that reads from the special mocked out
// file list set via __setMockFiles
function readdirSync(directoryPath) {
  return mockFiles[directoryPath] || [];
}

fs.__setMockFiles = __setMockFiles;
fs.readdirSync = readdirSync;

module.exports = fs;

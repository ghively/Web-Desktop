import fs from 'fs';
import path from 'path';
import os from 'os';

export interface TestFile {
  name: string;
  content: string;
  path: string;
}

export interface TestDirectory {
  name: string;
  path: string;
  files: TestFile[];
  subdirectories: TestDirectory[];
}

export class TestFileSystem {
  private tempDir: string;

  constructor() {
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'web-desktop-test-'));
  }

  getTempDir(): string {
    return this.tempDir;
  }

  createFile(fileName: string, content: string = ''): string {
    const filePath = path.join(this.tempDir, fileName);
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  createDirectory(dirName: string): string {
    const dirPath = path.join(this.tempDir, dirName);
    fs.mkdirSync(dirPath, { recursive: true });
    return dirPath;
  }

  createNestedStructure(): void {
    // Create main directories
    const docsDir = this.createDirectory('documents');
    const picsDir = this.createDirectory('pictures');
    const codeDir = this.createDirectory('code');

    // Create files
    this.createFile('readme.txt', 'This is a test readme file');
    this.createFile('config.json', JSON.stringify({ test: true, version: '1.0.0' }));
    this.createFile('notes.md', '# Test Notes\n\nThis is a markdown test file.');

    // Create nested files
    fs.writeFileSync(path.join(docsDir, 'essay.txt'), 'This is an essay.');
    fs.writeFileSync(path.join(docsDir, 'report.pdf'), 'fake-pdf-content');

    fs.writeFileSync(path.join(picsDir, 'image.jpg'), 'fake-jpg-content');
    fs.writeFileSync(path.join(picsDir, 'screenshot.png'), 'fake-png-content');

    fs.writeFileSync(path.join(codeDir, 'script.js'), 'console.log("Hello World");');
    fs.writeFileSync(path.join(codeDir, 'style.css'), 'body { margin: 0; }');

    // Create subdirectory
    const subDir = path.join(codeDir, 'components');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, 'Button.tsx'), 'export const Button = () => <button>Click</button>;');
  }

  cleanup(): void {
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    }
  }

  // Helper methods for common test scenarios
  createLargeFile(fileName: string, sizeInMB: number = 1): string {
    const content = 'x'.repeat(sizeInMB * 1024 * 1024);
    return this.createFile(fileName, content);
  }

  createSymlink(source: string, linkName: string): void {
    const linkPath = path.join(this.tempDir, linkName);
    fs.symlinkSync(source, linkPath);
  }
}
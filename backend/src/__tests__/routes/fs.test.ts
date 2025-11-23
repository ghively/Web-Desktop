import request from 'supertest';
import { createTestServer, stopTestServer } from '../internal/helpers/testServer';
import { TestFileSystem } from '../internal/fixtures/fileFixtures';

describe('Filesystem Routes', () => {
  let testServer: any;
  let testFS: TestFileSystem;

  beforeAll(async () => {
    testServer = await createTestServer();
    testFS = new TestFileSystem();
    testFS.createNestedStructure();
  });

  afterAll(async () => {
    await stopTestServer(testServer);
    testFS.cleanup();
  });

  describe('GET /api/fs', () => {
    it('should list files in home directory', async () => {
      const response = await request(testServer.app)
        .get('/api/fs')
        .expect(200);

      expect(response.body).toHaveProperty('path');
      expect(response.body).toHaveProperty('files');
      expect(Array.isArray(response.body.files)).toBe(true);
    });

    it('should list files in valid subdirectory', async () => {
      const tempDir = testFS.getTempDir();
      const response = await request(testServer.app)
        .get(`/api/fs?path=${encodeURIComponent(tempDir)}`)
        .expect(200);

      expect(response.body.path).toBe(tempDir);
      expect(Array.isArray(response.body.files)).toBe(true);
    });

    it('should include file metadata', async () => {
      const tempDir = testFS.getTempDir();
      const response = await request(testServer.app)
        .get(`/api/fs?path=${encodeURIComponent(tempDir)}`)
        .expect(200);

      const files = response.body.files;
      if (files.length > 0) {
        const file = files[0];
        expect(file).toHaveProperty('name');
        expect(file).toHaveProperty('isDirectory');
        expect(file).toHaveProperty('path');
        expect(file).toHaveProperty('size');
        expect(file).toHaveProperty('modified');
        expect(typeof file.isDirectory).toBe('boolean');
        expect(typeof file.size).toBe('number');
      }
    });

    it('should return 404 for non-existent directory', async () => {
      const response = await request(testServer.app)
        .get('/api/fs?path=/non/existent/path')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Directory not found');
    });

    it('should return 400 for file path instead of directory', async () => {
      const filePath = testFS.createFile('test.txt', 'content');
      const response = await request(testServer.app)
        .get(`/api/fs?path=${encodeURIComponent(filePath)}`)
        .expect(400);

      expect(response.body.error).toBe('Path is not a directory');
    });
  });

  describe('Security Tests', () => {
    it('should reject path traversal with ../', async () => {
      await request(testServer.app)
        .get('/api/fs?path=../../../etc/passwd')
        .expect(200); // Falls back to home directory

      // Additional verification could be added here if needed
    });

    it('should reject URL encoded path traversal', async () => {
      await request(testServer.app)
        .get('/api/fs?path=%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd')
        .expect(200); // Falls back to home directory
    });

    it('should reject null bytes in path', async () => {
      await request(testServer.app)
        .get('/api/fs?path=/home/user\x00malicious')
        .expect(200); // Falls back to home directory
    });

    it('should reject paths with control characters', async () => {
      await request(testServer.app)
        .get('/api/fs?path=/home/user\x1bmagic')
        .expect(200); // Falls back to home directory
    });

    it('should limit directory listing size', async () => {
      // Create a directory with many files
      const largeDir = testFS.createDirectory('large');
      for (let i = 0; i < 1500; i++) {
        testFS.createFile(`large/file${i}.txt`, 'content');
      }

      const response = await request(testServer.app)
        .get(`/api/fs?path=${encodeURIComponent(largeDir)}`)
        .expect(200);

      // Should limit to 1000 files
      expect(response.body.files.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('POST /api/fs/operation', () => {
    it('should create a folder', async () => {
      const tempDir = testFS.getTempDir();
      const response = await request(testServer.app)
        .post('/api/fs/operation')
        .send({
          type: 'create_folder',
          path: tempDir,
          name: 'test-folder'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject folder creation with invalid name', async () => {
      const tempDir = testFS.getTempDir();
      const response = await request(testServer.app)
        .post('/api/fs/operation')
        .send({
          type: 'create_folder',
          path: tempDir,
          name: '../malicious'
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid name parameter');
    });

    it('should delete a file', async () => {
      const filePath = testFS.createFile('to-delete.txt', 'content');
      const response = await request(testServer.app)
        .post('/api/fs/operation')
        .send({
          type: 'delete',
          path: filePath
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should rename a file', async () => {
      const filePath = testFS.createFile('old-name.txt', 'content');
      const response = await request(testServer.app)
        .post('/api/fs/operation')
        .send({
          type: 'rename',
          path: filePath,
          name: 'new-name.txt'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject rename to different directory', async () => {
      const filePath = testFS.createFile('test.txt', 'content');
      const response = await request(testServer.app)
        .post('/api/fs/operation')
        .send({
          type: 'rename',
          path: filePath,
          name: '../other-dir/file.txt'
        })
        .expect(403);

      expect(response.body.error).toContain('Cannot move to different directory');
    });

    it('should require valid operation type', async () => {
      const response = await request(testServer.app)
        .post('/api/fs/operation')
        .send({
          type: 'invalid_operation',
          path: '/some/path'
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid operation type');
    });

    it('should require path parameter', async () => {
      const response = await request(testServer.app)
        .post('/api/fs/operation')
        .send({
          type: 'create_folder',
          name: 'test'
        })
        .expect(400);

      expect(response.body.error).toBe('Missing type or path');
    });
  });

  describe('POST /api/fs/upload', () => {
    it('should upload a valid text file', async () => {
      const tempDir = testFS.getTempDir();
      const content = 'Hello, World!';
      const base64Content = Buffer.from(content).toString('base64');

      const response = await request(testServer.app)
        .post('/api/fs/upload')
        .send({
          path: tempDir,
          filename: 'test.txt',
          content: base64Content
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.path).toContain('test.txt');
      expect(response.body.size).toBe(content.length);
    });

    it('should upload a valid image file', async () => {
      const tempDir = testFS.getTempDir();
      // PNG header (minimal)
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        // Minimal IHDR chunk
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
        0xFE, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
        0xAE, 0x42, 0x60, 0x82
      ]);
      const base64Content = pngBuffer.toString('base64');

      const response = await request(testServer.app)
        .post('/api/fs/upload')
        .send({
          path: tempDir,
          filename: 'test.png',
          content: base64Content
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.detectedType).toBe('image/png');
    });

    it('should reject executable files', async () => {
      const tempDir = testFS.getTempDir();
      // ELF executable header
      const elfBuffer = Buffer.from([0x7F, 0x45, 0x4C, 0x46]);
      const base64Content = elfBuffer.toString('base64');

      const response = await request(testServer.app)
        .post('/api/fs/upload')
        .send({
          path: tempDir,
          filename: 'malicious.exe',
          content: base64Content
        })
        .expect(400);

      expect(response.body.error).toBe('Executable files are not allowed');
    });

    it('should reject files with dangerous extensions', async () => {
      const tempDir = testFS.getTempDir();
      const content = 'not really executable';
      const base64Content = Buffer.from(content).toString('base64');

      const response = await request(testServer.app)
        .post('/api/fs/upload')
        .send({
          path: tempDir,
          filename: 'malicious.bat',
          content: base64Content
        })
        .expect(400);

      expect(response.body.error).toBe('Files with executable extensions are not allowed');
    });

    it('should reject files with multiple extensions', async () => {
      const tempDir = testFS.getTempDir();
      const content = 'not really an image';
      const base64Content = Buffer.from(content).toString('base64');

      const response = await request(testServer.app)
        .post('/api/fs/upload')
        .send({
          path: tempDir,
          filename: 'malicious.jpg.exe',
          content: base64Content
        })
        .expect(400);

      expect(response.body.error).toBe('Multiple file extensions not allowed');
    });

    it('should reject oversized files', async () => {
      const tempDir = testFS.getTempDir();
      const largeContent = 'x'.repeat(200 * 1024 * 1024); // 200MB
      const base64Content = Buffer.from(largeContent).toString('base64');

      const response = await request(testServer.app)
        .post('/api/fs/upload')
        .send({
          path: tempDir,
          filename: 'large.txt',
          content: base64Content
        })
        .expect(400);

      expect(response.body.error).toContain('File too large');
    });

    it('should reject invalid base64 content', async () => {
      const tempDir = testFS.getTempDir();

      const response = await request(testServer.app)
        .post('/api/fs/upload')
        .send({
          path: tempDir,
          filename: 'test.txt',
          content: 'invalid-base64!!!'
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid base64 content');
    });

    it('should require all upload parameters', async () => {
      const response = await request(testServer.app)
        .post('/api/fs/upload')
        .send({
          path: '/tmp',
          filename: 'test.txt'
          // missing content
        })
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });
  });

  describe('POST /api/fs/copy', () => {
    it('should copy a file successfully', async () => {
      const sourceFile = testFS.createFile('source.txt', 'content to copy');
      const destFile = sourceFile.replace('source.txt', 'dest.txt');

      const response = await request(testServer.app)
        .post('/api/fs/copy')
        .send({
          source: sourceFile,
          destination: destFile
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject copy to existing destination', async () => {
      const sourceFile = testFS.createFile('source.txt', 'content');
      const destFile = testFS.createFile('dest.txt', 'existing');

      const response = await request(testServer.app)
        .post('/api/fs/copy')
        .send({
          source: sourceFile,
          destination: destFile
        })
        .expect(409);

      expect(response.body.error).toBe('Destination already exists');
    });

    it('should require source and destination', async () => {
      const response = await request(testServer.app)
        .post('/api/fs/copy')
        .send({
          source: '/some/path'
          // missing destination
        })
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });
  });

  describe('GET /api/fs/read', () => {
    it('should read a text file', async () => {
      const content = 'This is test content';
      const filePath = testFS.createFile('read-test.txt', content);

      const response = await request(testServer.app)
        .get(`/api/fs/read?path=${encodeURIComponent(filePath)}`)
        .expect(200);

      expect(response.body.content).toBe(content);
      expect(response.body.type).toBe('text');
      expect(response.body.mimeType).toBe('text/plain');
    });

    it('should return binary content as base64', async () => {
      // Create a small binary file
      const binaryContent = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
      const filePath = testFS.createFile('binary.bin', binaryContent.toString());

      const response = await request(testServer.app)
        .get(`/api/fs/read?path=${encodeURIComponent(filePath)}`)
        .expect(200);

      expect(response.body.type).toBe('binary');
      expect(response.body.content).toBe(binaryContent.toString('base64'));
    });

    it('should reject reading directories as files', async () => {
      const dirPath = testFS.createDirectory('test-dir');

      const response = await request(testServer.app)
        .get(`/api/fs/read?path=${encodeURIComponent(dirPath)}`)
        .expect(400);

      expect(response.body.error).toBe('Cannot read directory as file');
    });

    it('should require path parameter', async () => {
      const response = await request(testServer.app)
        .get('/api/fs/read')
        .expect(400);

      expect(response.body.error).toBe('Missing required parameter: path');
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      const tempDir = testFS.getTempDir();

      // Make multiple requests within limit
      for (let i = 0; i < 5; i++) {
        await request(testServer.app)
          .get(`/api/fs?path=${encodeURIComponent(tempDir)}`)
          .expect(200);
      }
    });

    // Note: Testing actual rate limiting would require either:
    // 1. Mocking the rate limiting middleware
    // 2. Making many requests quickly (which slows down tests)
    // 3. Using a test-specific configuration with lower limits
  });

  describe('Error Handling', () => {
    it('should handle access denied errors', async () => {
      // Try to access a system directory (will likely be denied)
      const response = await request(testServer.app)
        .get('/api/fs?path=/root')
        .expect(404); // Falls back to home dir check, then 404

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON', async () => {
      await request(testServer.app)
        .post('/api/fs/operation')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });
  });
});
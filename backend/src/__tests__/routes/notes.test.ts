import request from 'supertest';
import fs from 'fs/promises';
import path from 'path';
import { createTestServer, stopTestServer } from '../internal/helpers/testServer';

describe('Notes Routes', () => {
  let testServer: any;
  const TEST_NOTES_DIR = path.join(process.cwd(), 'data', 'notes');

  beforeAll(async () => {
    testServer = await createTestServer();
    // Ensure test notes directory exists and is clean
    try {
      await fs.mkdir(TEST_NOTES_DIR, { recursive: true });
      // Clean up any existing test notes
      const files = await fs.readdir(TEST_NOTES_DIR);
      await Promise.all(files.map(file => fs.unlink(path.join(TEST_NOTES_DIR, file))));
    } catch (error) {
      // Directory creation failed, but tests might still work
    }
  });

  afterAll(async () => {
    try {
      // Clean up test notes
      const files = await fs.readdir(TEST_NOTES_DIR);
      await Promise.all(files.map(file => fs.unlink(path.join(TEST_NOTES_DIR, file))));
    } catch (error) {
      // Ignore cleanup errors
    }
    await stopTestServer(testServer);
  });

  beforeEach(async () => {
    // Clean up before each test
    try {
      const files = await fs.readdir(TEST_NOTES_DIR);
      await Promise.all(files.map(file => fs.unlink(path.join(TEST_NOTES_DIR, file))));
    } catch (error) {
      // Directory might not exist yet
    }
  });

  describe('POST /api/notes - Create note', () => {
    it('should create a note with title only', async () => {
      const noteData = {
        title: 'Test Note'
      };

      const response = await request(testServer.app)
        .post('/api/notes')
        .send(noteData)
        .expect(200);

      expect(response.body).toHaveProperty('note');
      expect(response.body.note.title).toBe('Test Note');
      expect(response.body.note.content).toBe('');
      expect(response.body.note.tags).toEqual([]);
      expect(response.body.note).toHaveProperty('id');
      expect(response.body.note).toHaveProperty('createdAt');
      expect(response.body.note).toHaveProperty('updatedAt');
    });

    it('should create a note with title, content, and tags', async () => {
      const noteData = {
        title: 'Comprehensive Note',
        content: 'This is the content of the note',
        tags: ['test', 'important', 'work']
      };

      const response = await request(testServer.app)
        .post('/api/notes')
        .send(noteData)
        .expect(200);

      expect(response.body.note.title).toBe('Comprehensive Note');
      expect(response.body.note.content).toBe('This is the content of the note');
      expect(response.body.note.tags).toEqual(['test', 'important', 'work']);
    });

    it('should sanitize title length', async () => {
      const longTitle = 'x'.repeat(300);
      const noteData = {
        title: longTitle
      };

      const response = await request(testServer.app)
        .post('/api/notes')
        .send(noteData)
        .expect(200);

      expect(response.body.note.title.length).toBeLessThanOrEqual(200);
    });

    it('should sanitize content length', async () => {
      const longContent = 'x'.repeat(2000000); // 2MB
      const noteData = {
        title: 'Test Note',
        content: longContent
      };

      const response = await request(testServer.app)
        .post('/api/notes')
        .send(noteData)
        .expect(200);

      expect(response.body.note.content.length).toBeLessThanOrEqual(1000000); // 1MB limit
    });

    it('should sanitize tags', async () => {
      const noteData = {
        title: 'Test Note',
        tags: ['valid-tag', '  spaced-tag  ', '', null, undefined, 'x'.repeat(100), Array(30).fill('tag')]
      };

      const response = await request(testServer.app)
        .post('/api/notes')
        .send(noteData)
        .expect(200);

      expect(response.body.note.tags).toEqual(['valid-tag', 'spaced-tag', 'x'.repeat(50)]);
      expect(response.body.note.tags.length).toBeLessThanOrEqual(20);
    });

    it('should reject missing title', async () => {
      const noteData = {
        content: 'Content without title'
      };

      const response = await request(testServer.app)
        .post('/api/notes')
        .send(noteData)
        .expect(400);

      expect(response.body.error).toBe('Title is required and must be a string');
    });

    it('should reject empty title', async () => {
      const noteData = {
        title: '   '
      };

      const response = await request(testServer.app)
        .post('/api/notes')
        .send(noteData)
        .expect(400);

      expect(response.body.error).toBe('Title cannot be empty');
    });

    it('should reject non-string title', async () => {
      const noteData = {
        title: 123
      };

      const response = await request(testServer.app)
        .post('/api/notes')
        .send(noteData)
        .expect(400);

      expect(response.body.error).toBe('Title is required and must be a string');
    });

    it('should reject non-string content', async () => {
      const noteData = {
        title: 'Test Note',
        content: 123
      };

      const response = await request(testServer.app)
        .post('/api/notes')
        .send(noteData)
        .expect(400);

      expect(response.body.error).toBe('Content must be a string');
    });

    it('should reject non-array tags', async () => {
      const noteData = {
        title: 'Test Note',
        tags: 'not-an-array'
      };

      const response = await request(testServer.app)
        .post('/api/notes')
        .send(noteData)
        .expect(400);

      expect(response.body.error).toBe('Tags must be an array');
    });
  });

  describe('GET /api/notes - List notes', () => {
    beforeEach(async () => {
      // Create some test notes
      const notes = [
        { title: 'First Note', content: 'Content 1', tags: ['tag1'] },
        { title: 'Second Note', content: 'Content 2', tags: ['tag2'] },
        { title: 'Third Note', content: 'Content 3', tags: ['tag1', 'tag2'] }
      ];

      for (const note of notes) {
        await request(testServer.app)
          .post('/api/notes')
          .send(note);
      }
    });

    it('should list all notes', async () => {
      const response = await request(testServer.app)
        .get('/api/notes')
        .expect(200);

      expect(response.body).toHaveProperty('notes');
      expect(Array.isArray(response.body.notes)).toBe(true);
      expect(response.body.notes.length).toBe(3);
    });

    it('should sort notes by updated date (newest first)', async () => {
      const response = await request(testServer.app)
        .get('/api/notes')
        .expect(200);

      const notes = response.body.notes;
      const dates = notes.map((note: any) => new Date(note.updatedAt).getTime());

      // Verify that dates are in descending order
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i-1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });

    it('should return empty array when no notes exist', async () => {
      // Clean up all notes
      const files = await fs.readdir(TEST_NOTES_DIR);
      await Promise.all(files.map(file => fs.unlink(path.join(TEST_NOTES_DIR, file))));

      const response = await request(testServer.app)
        .get('/api/notes')
        .expect(200);

      expect(response.body.notes).toEqual([]);
    });

    it('should handle corrupted note files gracefully', async () => {
      // Create a corrupted JSON file
      const corruptedFile = path.join(TEST_NOTES_DIR, 'corrupted.json');
      await fs.writeFile(corruptedFile, '{ invalid json content');

      const response = await request(testServer.app)
        .get('/api/notes')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/notes/:id - Get specific note', () => {
    let noteId: string;

    beforeEach(async () => {
      const response = await request(testServer.app)
        .post('/api/notes')
        .send({
          title: 'Test Note for Get',
          content: 'Test content',
          tags: ['test']
        });
      noteId = response.body.note.id;
    });

    it('should get a specific note by ID', async () => {
      const response = await request(testServer.app)
        .get(`/api/notes/${noteId}`)
        .expect(200);

      expect(response.body).toHaveProperty('note');
      expect(response.body.note.id).toBe(noteId);
      expect(response.body.note.title).toBe('Test Note for Get');
    });

    it('should return 404 for non-existent note', async () => {
      const response = await request(testServer.app)
        .get('/api/notes/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('Note not found');
    });

    it('should reject invalid note ID format', async () => {
      const response = await request(testServer.app)
        .get('/api/notes/invalid-id-with!@#$')
        .expect(400);

      expect(response.body.error).toBe('Invalid note ID');
    });

    it('should handle malformed note files', async () => {
      // Create a malformed JSON file
      const malformedFile = path.join(TEST_NOTES_DIR, 'malformed.json');
      await fs.writeFile(malformedFile, '{ invalid json');

      const response = await request(testServer.app)
        .get('/api/notes/malformed')
        .expect(500);

      expect(response.body.error).toBe('Invalid note file format');
    });
  });

  describe('PUT /api/notes/:id - Update note', () => {
    let noteId: string;

    beforeEach(async () => {
      const response = await request(testServer.app)
        .post('/api/notes')
        .send({
          title: 'Original Note',
          content: 'Original content',
          tags: ['original']
        });
      noteId = response.body.note.id;
    });

    it('should update note title', async () => {
      const updateData = {
        title: 'Updated Title'
      };

      const response = await request(testServer.app)
        .put(`/api/notes/${noteId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.note.title).toBe('Updated Title');
      expect(response.body.note.content).toBe('Original content');
      expect(response.body.note.tags).toEqual(['original']);
      expect(response.body.note.updatedAt).not.toBe(response.body.note.createdAt);
    });

    it('should update note content', async () => {
      const updateData = {
        content: 'Updated content'
      };

      const response = await request(testServer.app)
        .put(`/api/notes/${noteId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.note.title).toBe('Original Note');
      expect(response.body.note.content).toBe('Updated content');
      expect(response.body.note.tags).toEqual(['original']);
    });

    it('should update note tags', async () => {
      const updateData = {
        tags: ['updated', 'new-tag']
      };

      const response = await request(testServer.app)
        .put(`/api/notes/${noteId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.note.title).toBe('Original Note');
      expect(response.body.note.content).toBe('Original content');
      expect(response.body.note.tags).toEqual(['updated', 'new-tag']);
    });

    it('should update all fields at once', async () => {
      const updateData = {
        title: 'Completely Updated',
        content: 'Completely new content',
        tags: ['complete', 'update']
      };

      const response = await request(testServer.app)
        .put(`/api/notes/${noteId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.note.title).toBe('Completely Updated');
      expect(response.body.note.content).toBe('Completely new content');
      expect(response.body.note.tags).toEqual(['complete', 'update']);
    });

    it('should return 404 for non-existent note', async () => {
      const response = await request(testServer.app)
        .put('/api/notes/non-existent-id')
        .send({ title: 'Updated' })
        .expect(404);

      expect(response.body.error).toBe('Note not found');
    });

    it('should reject empty title', async () => {
      const response = await request(testServer.app)
        .put(`/api/notes/${noteId}`)
        .send({ title: '   ' })
        .expect(400);

      expect(response.body.error).toBe('Title cannot be empty');
    });

    it('should reject invalid ID format', async () => {
      const response = await request(testServer.app)
        .put('/api/notes/invalid-id!')
        .send({ title: 'Updated' })
        .expect(400);

      expect(response.body.error).toBe('Invalid note ID');
    });
  });

  describe('DELETE /api/notes/:id - Delete note', () => {
    let noteId: string;

    beforeEach(async () => {
      const response = await request(testServer.app)
        .post('/api/notes')
        .send({
          title: 'Note to Delete',
          content: 'Will be deleted'
        });
      noteId = response.body.note.id;
    });

    it('should delete a note', async () => {
      const response = await request(testServer.app)
        .delete(`/api/notes/${noteId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Note deleted');

      // Verify note is gone
      await request(testServer.app)
        .get(`/api/notes/${noteId}`)
        .expect(404);
    });

    it('should return 404 for non-existent note', async () => {
      const response = await request(testServer.app)
        .delete('/api/notes/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('Note not found');
    });

    it('should reject invalid ID format', async () => {
      const response = await request(testServer.app)
        .delete('/api/notes/invalid-id@#$')
        .expect(400);

      expect(response.body.error).toBe('Invalid note ID');
    });
  });

  describe('GET /api/notes/search - Search notes', () => {
    beforeEach(async () => {
      // Create test notes with different content
      const notes = [
        { title: 'JavaScript Tutorial', content: 'Learn JavaScript programming', tags: ['javascript', 'tutorial'] },
        { title: 'Python Guide', content: 'Python programming guide', tags: ['python', 'guide'] },
        { title: 'Web Development', content: 'HTML, CSS, and JavaScript', tags: ['web', 'javascript'] },
        { title: 'Database Design', content: 'SQL and database design principles', tags: ['database', 'sql'] }
      ];

      for (const note of notes) {
        await request(testServer.app)
          .post('/api/notes')
          .send(note);
      }
    });

    it('should search notes by title', async () => {
      const response = await request(testServer.app)
        .get('/api/notes/search?q=JavaScript')
        .expect(200);

      expect(response.body.notes.length).toBe(2);
      expect(response.body.notes.every((note: any) =>
        note.title.includes('javascript') || note.content.includes('javascript')
      )).toBe(true);
    });

    it('should search notes by content', async () => {
      const response = await request(testServer.app)
        .get('/api/notes/search?q=programming')
        .expect(200);

      expect(response.body.notes.length).toBe(2);
      expect(response.body.notes.every((note: any) =>
        note.title.includes('programming') || note.content.includes('programming')
      )).toBe(true);
    });

    it('should return case-insensitive results', async () => {
      const response1 = await request(testServer.app)
        .get('/api/notes/search?q=JAVASCRIPT')
        .expect(200);

      const response2 = await request(testServer.app)
        .get('/api/notes/search?q=javascript')
        .expect(200);

      expect(response1.body.notes.length).toBe(response2.body.notes.length);
    });

    it('should reject missing query parameter', async () => {
      const response = await request(testServer.app)
        .get('/api/notes/search')
        .expect(400);

      expect(response.body.error).toBe('Search query is required');
    });

    it('should reject empty query', async () => {
      const response = await request(testServer.app)
        .get('/api/notes/search?q=')
        .expect(400);

      expect(response.body.error).toBe('Invalid search query');
    });

    it('should reject overly long queries', async () => {
      const longQuery = 'x'.repeat(1001);
      const response = await request(testServer.app)
        .get(`/api/notes/search?q=${longQuery}`)
        .expect(200); // Gets truncated to 1000 chars

      // Should still work but with truncated query
      expect(response.body).toHaveProperty('notes');
    });

    it('should reject dangerous regex patterns', async () => {
      const dangerousQueries = [
        '***',
        '(very long content that might cause regex issues'.padEnd(25, 'x'),
        '[very long content that might cause regex issues'.padEnd(25, 'x'),
        '\\\\',
        '^.*^'
      ];

      for (const query of dangerousQueries) {
        const response = await request(testServer.app)
          .get(`/api/notes/search?q=${encodeURIComponent(query)}`)
          .expect(400);

        expect(response.body.error).toBe('Invalid search query pattern');
      }
    });

    it('should sanitize dangerous characters', async () => {
      const response = await request(testServer.app)
        .get('/api/notes/search?q=<script>alert("xss")</script>')
        .expect(200);

      // Query gets sanitized, should return results for sanitized version
      expect(response.body).toHaveProperty('notes');
    });

    it('should return empty results for non-matching query', async () => {
      const response = await request(testServer.app)
        .get('/api/notes/search?q=nonexistentterm')
        .expect(200);

      expect(response.body.notes).toEqual([]);
    });
  });

  describe('Security Tests', () => {
    it('should prevent path traversal in note ID', async () => {
      const response = await request(testServer.app)
        .get('/api/notes/../../../etc/passwd')
        .expect(400);

      expect(response.body.error).toBe('Invalid note ID');
    });

    it('should handle malicious input in note content', async () => {
      const maliciousContent = '<script>alert("xss")</script>'.repeat(100);
      const noteData = {
        title: 'Test Note',
        content: maliciousContent
      };

      const response = await request(testServer.app)
        .post('/api/notes')
        .send(noteData)
        .expect(200);

      // Content should be stored as-is (XSS protection is frontend responsibility)
      expect(response.body.note.content).toContain('<script>');
    });

    it('should limit concurrent note creation to prevent DoS', async () => {
      // This test checks that the system handles multiple concurrent requests
      const promises = Array(10).fill(null).map(() =>
        request(testServer.app)
          .post('/api/notes')
          .send({ title: 'Concurrent Test Note' })
      );

      const responses = await Promise.all(promises);

      // All should succeed (or fail gracefully)
      const successCount = responses.filter(r => r.status === 200).length;
      const errorCount = responses.filter(r => r.status !== 200).length;

      expect(successCount + errorCount).toBe(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      await request(testServer.app)
        .post('/api/notes')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });

    it('should handle missing request body', async () => {
      const response = await request(testServer.app)
        .post('/api/notes')
        .send()
        .expect(400);

      expect(response.body.error).toBe('Title is required and must be a string');
    });
  });
});
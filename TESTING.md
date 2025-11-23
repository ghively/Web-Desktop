# Testing Guide for Web Desktop

This comprehensive testing guide covers all aspects of testing for the Web Desktop application, including backend unit tests, frontend component tests, and end-to-end testing.

## Table of Contents

1. [Overview](#overview)
2. [Backend Testing](#backend-testing)
3. [Frontend Testing](#frontend-testing)
4. [End-to-End Testing](#end-to-end-testing)
5. [Test Infrastructure](#test-infrastructure)
6. [Running Tests](#running-tests)
7. [Writing Tests](#writing-tests)
8. [Best Practices](#best-practices)
9. [CI/CD Integration](#cicd-integration)
10. [Troubleshooting](#troubleshooting)

## Overview

The Web Desktop project uses a multi-layered testing approach:

- **Backend**: Jest with TypeScript for API route testing
- **Frontend**: Vitest with React Testing Library for component testing
- **E2E**: Playwright for full user journey testing
- **Coverage**: Integrated coverage reporting with thresholds

## Backend Testing

### Framework Setup

Backend uses **Jest** with **TypeScript** support:

```bash
cd backend
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
```

### Test Structure

```
backend/src/__tests__/
├── routes/              # API route tests
│   ├── fs.test.ts      # File system routes
│   ├── system.test.ts  # System information routes
│   └── notes.test.ts   # Notes management routes
├── internal/            # Test utilities and fixtures
│   ├── helpers/
│   │   └── testServer.ts
│   └── fixtures/
│       └── fileFixtures.ts
└── setup.ts            # Global test setup
```

### Running Backend Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests for CI
npm run test:ci
```

### Key Backend Tests

#### File System Routes (`fs.test.ts`)
- **Security Tests**: Path traversal, input validation
- **Functionality Tests**: File operations, directory listing
- **Upload Tests**: File type validation, size limits
- **Error Handling**: Invalid requests, permission errors

#### System Routes (`system.test.ts`)
- **Stats Tests**: CPU/memory monitoring
- **Security Tests**: Command execution prevention
- **Error Tests**: System information failures

#### Notes Routes (`notes.test.ts`)
- **CRUD Tests**: Create, read, update, delete operations
- **Search Tests**: Content search functionality
- **Validation Tests**: Input sanitization, size limits
- **Security Tests**: XSS prevention, injection attacks

### Backend Test Examples

```typescript
// Example: Testing file upload with security validation
describe('POST /api/fs/upload', () => {
  it('should reject executable files', async () => {
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
});
```

## Frontend Testing

### Framework Setup

Frontend uses **Vitest** with **React Testing Library**:

```bash
cd frontend
npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

### Test Structure

```
frontend/src/
├── test/
│   └── setup.ts         # Global test setup
├── components/__tests__/  # Component tests
├── context/__tests__/     # Context tests
├── hooks/__tests__/       # Hook tests
└── utils/__tests__/       # Utility tests
```

### Running Frontend Tests

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests once
npm run test:run

# Generate coverage
npm run test:coverage
```

### Frontend Test Examples

```typescript
// Example: Testing Window component
import { render, screen, fireEvent } from '@testing-library/react';
import { Window } from '../Window';

describe('Window Component', () => {
  it('should render window with title', () => {
    render(<Window title="Test Window" onClose={vi.fn()}>Content</Window>);
    expect(screen.getByText('Test Window')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Window title="Test" onClose={onClose}>Content</Window>);

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

## End-to-End Testing

### Framework Setup

E2E testing uses **Playwright**:

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### Test Structure

```
e2e/
├── tests/                # E2E test files
├── fixtures/             # Test data and utilities
└── playwright.config.ts  # Playwright configuration
```

### Running E2E Tests

```bash
# Run all E2E tests
npx playwright test

# Run tests in headed mode
npx playwright test --headed

# Run tests on specific browser
npx playwright test --project=chromium

# Generate test report
npx playwright test --reporter=html
```

### E2E Test Examples

```typescript
// Example: Testing file upload workflow
import { test, expect } from '@playwright/test';

test('should upload and display file', async ({ page }) => {
  await page.goto('/');

  // Open file manager
  await page.click('[data-testid="file-manager"]');

  // Upload a test file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('test-file.txt');

  // Verify file appears in list
  await expect(page.locator('text=test-file.txt')).toBeVisible();
});
```

## Test Infrastructure

### Mock Services

#### Backend Mocks
- **File System**: In-memory file operations
- **System Info**: Mock CPU/memory data
- **WebSocket**: Mock terminal connections

#### Frontend Mocks
- **API Calls**: Mock HTTP responses
- **Browser APIs**: Mock IntersectionObserver, ResizeObserver
- **WebSocket**: Mock terminal connections

### Test Fixtures

#### File System Fixtures
```typescript
// Test file system with controlled structure
const testFS = new TestFileSystem();
testFS.createNestedStructure();
```

#### API Response Fixtures
```typescript
// Mock API responses
const mockSystemStats = {
  cpu: 25,
  mem: { total: 8000000000, used: 4000000000, percent: 50 }
};
```

## Running Tests

### Quick Start

```bash
# Install all dependencies
npm run install:all

# Run all tests across all modules
npm run test:all

# Run tests with coverage
npm run test:coverage:all
```

### Individual Test Suites

```bash
# Backend only
cd backend && npm test

# Frontend only
cd frontend && npm test

# E2E only
npx playwright test
```

### Development Workflow

```bash
# Backend development with tests
cd backend && npm run test:watch

# Frontend development with tests
cd frontend && npm run test:ui

# E2E development
npx playwright test --headed
```

## Writing Tests

### Backend Test Guidelines

1. **Security First**: Always test security boundaries
2. **Edge Cases**: Test invalid inputs and error conditions
3. **Mock External Dependencies**: Use test doubles for external services
4. **Isolation**: Each test should be independent
5. **Timeouts**: Set appropriate test timeouts

### Frontend Test Guidelines

1. **User Behavior**: Test what users see and do
2. **Accessibility**: Include ARIA roles and semantic HTML
3. **Async Operations**: Handle promises and loading states
4. **Mock Services**: Mock API calls and browser APIs
5. **Component Integration**: Test components in context

### E2E Test Guidelines

1. **User Journeys**: Test complete user workflows
2. **Cross-browser**: Test on multiple browsers
3. **Data Management**: Clean up test data between runs
4. **Flakiness Prevention**: Use proper waits and assertions
5. **Error Scenarios**: Test error handling and recovery

## Best Practices

### General Testing

- **Test Pyramid**: More unit tests, fewer E2E tests
- **Descriptive Names**: Clear, action-oriented test names
- **AAA Pattern**: Arrange, Act, Assert structure
- **Single Responsibility**: One assertion per test
- **Test Documentation**: Comment complex test scenarios

### Security Testing

- **Input Validation**: Test all input validation logic
- **Authentication**: Test authentication and authorization
- **Data Sanitization**: Verify XSS and injection prevention
- **Rate Limiting**: Test API rate limiting
- **Error Disclosure**: Ensure no sensitive data in errors

### Performance Testing

- **Load Testing**: Test API performance under load
- **Memory Leaks**: Check for memory leaks in long-running tests
- **Bundle Size**: Monitor frontend bundle size impact
- **Database Queries**: Optimize and test database queries

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Tests
on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd backend && npm ci
      - run: cd backend && npm run test:ci

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd frontend && npm ci
      - run: cd frontend && npm run test:run

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npx playwright test
```

### Coverage Reporting

```bash
# Generate coverage reports
npm run test:coverage:all

# Coverage thresholds
# Backend: >80%
# Frontend: >85%
# E2E: Not applicable (coverage measured through unit tests)
```

## Troubleshooting

### Common Issues

#### Backend Test Failures
- **Port Conflicts**: Ensure test servers use different ports
- **File Permissions**: Check test directory permissions
- **Database**: Clean up test data between runs

#### Frontend Test Failures
- **Mock Setup**: Verify all mocks are properly configured
- **Async Tests**: Use proper async/await patterns
- **Environment**: Ensure correct test environment setup

#### E2E Test Failures
- **Flakiness**: Add proper waits and retries
- **Browser Issues**: Update browser versions
- **Network**: Check network connectivity and timeouts

### Debug Mode

```bash
# Backend debug
npm run test:debug

# Frontend debug
npm run test:ui

# E2E debug
npx playwright test --debug
```

### Test Cleanup

```bash
# Clean test artifacts
npm run test:clean

# Reset test environment
npm run test:reset
```

## Contributing

When adding new features:

1. **Write Tests First**: TDD approach preferred
2. **Cover All Cases**: Include happy path and edge cases
3. **Security Testing**: Test all security implications
4. **Documentation**: Update this guide as needed
5. **Review**: Ensure tests pass before merging

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

This testing guide ensures comprehensive test coverage for the Web Desktop application, maintaining code quality and preventing regressions through automated testing at all levels.
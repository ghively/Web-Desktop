# Contributing to Web Desktop

Welcome to the Web Desktop contribution guide! We're excited to have you contribute to our project.

## 🤝 How to Contribute

### Ways to Contribute
- **Code Contributions**: Bug fixes, new features, performance improvements
- **Documentation**: Improve documentation, write tutorials, fix typos
- **Testing**: Write tests, report bugs, verify fixes
- **Design**: UI/UX improvements, icons, themes
- **Translations**: Help translate the interface to other languages
- **Community**: Answer questions, help others, share ideas

### Contribution Process
1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request
6. **Review** and incorporate feedback

---

## 🚀 Getting Started

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/web-desktop.git
   cd web-desktop
   ```

2. **Install Dependencies**
   ```bash
   npm install
   cd backend && npm install && cd ../frontend && npm install
   ```

3. **Start Development**
   ```bash
   ./start-stack.sh
   ```

For detailed setup instructions, see the [Development Setup Guide](setup.md).

### Project Structure
```
web-desktop/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Express middleware
│   │   ├── services/       # Business logic
│   │   └── types/          # TypeScript types
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── context/        # React context
│   │   ├── hooks/          # Custom hooks
│   │   └── services/       # API services
│   └── package.json
├── docs/                   # Documentation
└── README.md
```

---

## 📝 Development Guidelines

### Code Style

#### TypeScript/JavaScript
- Use **TypeScript** for all new code
- Follow **ESLint** configuration
- Use **Prettier** for formatting
- Write **JSDoc** comments for public APIs

```typescript
// Good example
/**
 * Lists files in a directory
 * @param path - Directory path to list
 * @param options - Listing options
 * @returns Promise<FileItem[]> Array of file items
 */
export async function listFiles(
  path: string,
  options: ListOptions = {}
): Promise<FileItem[]> {
  const adapter = getStorageAdapter(path);
  return adapter.listDirectory(path, options);
}
```

#### React Components
- Use **functional components** with hooks
- Follow **React best practices**
- Use **TypeScript interfaces** for props
- Include **prop-types** or TypeScript interfaces

```typescript
// Good example
interface FileManagerProps {
  initialPath?: string;
  onFileSelect?: (file: FileItem) => void;
  readOnly?: boolean;
}

export const FileManager: React.FC<FileManagerProps> = ({
  initialPath = '/home',
  onFileSelect,
  readOnly = false
}) => {
  // Component logic
};
```

### Git Conventions

#### Branch Naming
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/documentation-update` - Documentation changes
- `refactor/code-cleanup` - Refactoring
- `test/add-tests` - Adding tests

#### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(file-manager): add drag and drop file upload

fix(terminal): resolve cursor positioning issue
```

---

## 🧪 Testing Guidelines

### Testing Requirements
- **Unit tests** for all utility functions
- **Integration tests** for API endpoints
- **Component tests** for React components
- **E2E tests** for critical user journeys

### Writing Tests

#### Backend Tests
```typescript
// backend/src/__tests__/services/FileService.test.ts
import { FileService } from '../services/FileService';

describe('FileService', () => {
  let fileService: FileService;

  beforeEach(() => {
    fileService = new FileService();
  });

  describe('listFiles', () => {
    it('should return array of files', async () => {
      const files = await fileService.listFiles('/tmp');
      expect(Array.isArray(files)).toBe(true);
    });

    it('should throw error for invalid path', async () => {
      await expect(fileService.listFiles('/invalid/path'))
        .rejects.toThrow('Invalid path');
    });
  });
});
```

#### Frontend Tests
```typescript
// frontend/src/__tests__/components/FileManager.test.tsx
import { render, screen } from '@testing-library/react';
import { FileManager } from '../FileManager';

describe('FileManager', () => {
  it('renders file list', () => {
    render(<FileManager initialPath="/tmp" />);
    expect(screen.getByText('File Manager')).toBeInTheDocument();
  });

  it('calls onFileSelect when file is clicked', () => {
    const onFileSelect = jest.fn();
    render(<FileManager onFileSelect={onFileSelect} />);

    // Test file selection logic
  });
});
```

### Running Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# All tests
npm test

# Test with coverage
npm run test:coverage
```

---

## 🐛 Bug Reports

### Reporting Bugs

Before reporting a bug, please:
1. **Check existing issues** for similar reports
2. **Verify it's not a configuration issue**
3. **Test with the latest version**

### Bug Report Template
```markdown
## Bug Description
Brief description of the bug

## Steps to Reproduce
1. Go to...
2. Click on...
3. See error

## Expected Behavior
What you expected to happen

## Actual Behavior
What actually happened

## Environment
- OS: [e.g. Ubuntu 20.04]
- Browser: [e.g. Chrome 90]
- Web Desktop Version: [e.g. 1.0.0]

## Additional Context
Logs, screenshots, or other relevant information
```

---

## ✨ Feature Requests

### Requesting Features

1. **Check existing issues** for similar requests
2. **Check the roadmap** for planned features
3. **Use the feature request template**

### Feature Request Template
```markdown
## Feature Description
Clear description of the feature

## Problem Statement
What problem does this feature solve?

## Proposed Solution
How you envision the feature working

## Alternatives Considered
Other approaches you've considered

## Additional Context
Mockups, examples, or additional details
```

---

## 📖 Documentation

### Improving Documentation

#### Documentation Types
- **User Documentation**: Guides, tutorials, manuals
- **Developer Documentation**: API docs, architecture guides
- **Code Documentation**: Inline comments, JSDoc

#### Writing Guidelines
- Use **clear, concise language**
- Include **code examples**
- Add **screenshots** for UI features
- **Test** all instructions

#### Documentation Structure
```
docs/
├── user-guide/          # User documentation
├── developer/           # Developer documentation
├── deployment/          # Deployment guides
├── api/                 # API documentation
└── tutorials/           # Step-by-step tutorials
```

---

## 🔐 Security

### Security Best Practices

When contributing code:
- **Validate all inputs** and sanitize outputs
- **Use parameterized queries** for database operations
- **Follow principle of least privilege**
- **Never commit secrets** or API keys
- **Review security implications** of changes

### Reporting Security Issues
For security vulnerabilities, please:
1. **Do not** open a public issue
2. Email: security@webdesktop.dev
3. Include detailed information about the vulnerability
4. Allow time for response before disclosure

---

## 🎨 Design and UI

### UI/UX Contributions

#### Design System
- **Consistent styling**: Use Tailwind CSS classes
- **Responsive design**: Mobile-friendly interfaces
- **Accessibility**: WCAG 2.1 AA compliance
- **Theme support**: Light/dark mode compatibility

#### Icon Guidelines
- Use **Lucide React** icons when possible
- Maintain **consistent sizing** and styling
- Ensure **proper contrast** and visibility

#### Color Palette
Follow the **Catppuccin** color scheme:
```css
:root {
  --rosewater: #f5e0dc;
  --flamingo: #f2cdcd;
  --pink: #f5c2e7;
  --mauve: #cba6f7;
  --red: #f38ba8;
  --maroon: #eba0ac;
  --peach: #fab387;
  --yellow: #f9e2af;
  --green: #a6e3a1;
  --teal: #94e2d5;
  --sky: #89dceb;
  --sapphire: #74c7ec;
  --blue: #89b4fa;
  --lavender: #b4befe;
}
```

---

## 🌍 Internationalization

### Adding Translations

#### File Structure
```
frontend/src/locales/
├── en/
│   └── common.json
├── es/
│   └── common.json
└── fr/
    └── common.json
```

#### Translation Process
1. **Add translation keys** to English locale
2. **Create new locale file** for target language
3. **Translate all keys** accurately
4. **Test translation** in context
5. **Submit PR** with translation changes

#### Translation Guidelines
- **Maintain consistency** with terminology
- **Consider cultural context** and nuances
- **Test UI layout** with different text lengths
- **Use gender-neutral** language when possible

---

## 🔧 Development Tools

### Recommended Tools

#### IDE/Editor Setup
- **VS Code** with recommended extensions
- **WebStorm** for full-stack development
- **Vim** with TypeScript/React plugins

#### VS Code Extensions
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

#### Browser Extensions
- **React Developer Tools**
- **Redux DevTools** (if applicable)
- **Wappalyzer** (for web tech detection)

---

## 📊 Performance Guidelines

### Performance Considerations

#### Frontend Performance
- **Lazy loading** for components and routes
- **Code splitting** for large bundles
- **Image optimization** and lazy loading
- **Efficient state management**
- **Debounced search** and API calls

#### Backend Performance
- **Database indexing** for frequently queried fields
- **Connection pooling** for database connections
- **Caching** for expensive operations
- **Efficient file operations**
- **Rate limiting** to prevent abuse

### Performance Testing
```bash
# Frontend bundle analysis
npm run build:analyze

# Backend performance testing
npm run test:performance

# Load testing with artillery
artillery run load-test.yml
```

---

## 🔄 Release Process

### Version Management
- Follow **Semantic Versioning** (semver)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Security review completed
- [ ] Performance tested

### Release Commands
```bash
# Bump version
npm version patch|minor|major

# Build for production
npm run build

# Create release tag
git tag v1.0.0
git push origin v1.0.0
```

---

## 🤖 Automation

### CI/CD Pipeline
- **Automated testing** on all PRs
- **Code quality checks** (ESint, Prettier)
- **Security scanning** (dependency check)
- **Automated builds** for successful PRs

### Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged && npm run type-check",
      "pre-push": "npm test"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

---

## 🏆 Recognition

### Contributor Recognition
- **Contributor list** in README
- **GitHub badges** for significant contributions
- **Feature credits** in changelog
- **Community recognition** in discussions

### Becoming a Maintainer
- **Consistent quality** contributions
- **Active participation** in reviews
- **Community involvement**
- **Technical expertise** demonstrated

---

## 📞 Getting Help

### Community Support
- **GitHub Discussions**: General questions and ideas
- **GitHub Issues**: Bug reports and feature requests
- **Discord Community**: Real-time chat (if available)

### Documentation Resources
- [Getting Started Guide](../user-guide/getting-started.md)
- [Development Setup](setup.md)
- [API Documentation](../api/overview.md)
- [Architecture Overview](architecture.md)

---

## 📜 Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inclusive environment for everyone.

### Our Standards
- **Respect** for all participants
- **Inclusive language** and behavior
- **Focus on what is best** for the community
- **Empathy** towards other community members

### Enforcement
Instances of abusive behavior will be reviewed and addressed by the project maintainers.

---

Thank you for contributing to Web Desktop! 🎉

Your contributions help make Web Desktop better for everyone. We appreciate your time and effort in improving the project.
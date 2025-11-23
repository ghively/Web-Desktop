# AGENTS.md

## Build Commands

### Backend (Node.js/TypeScript)
- `npm run dev` - Start development server with ts-node
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run compiled server from dist/
- No tests configured yet

### Frontend (React/Vite)
- `npm run dev` - Start Vite dev server with hot reload
- `npm run build` - TypeScript compile + Vite build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Frontend-simple (Vanilla JS)
- No build process - served directly from backend static files

## Code Style Guidelines

### TypeScript/JavaScript
- Use strict TypeScript settings (backend: commonjs, frontend: esm)
- Import order: external libs → internal modules → relative imports
- Use ES6+ syntax and arrow functions
- Error handling with try/catch and proper HTTP status codes

### React Components
- Functional components with hooks
- Use TypeScript interfaces for props
- Tailwind CSS for styling with catppuccin color palette
- Lucide React for icons

### Backend API
- Express.js with TypeScript
- Separate route handlers in /routes directory
- Use async/await for async operations
- CORS enabled for frontend communication

### General
- No comments unless explicitly requested
- Follow existing naming conventions (camelCase for vars, PascalCase for components)
- Use semantic HTML5 elements
- Maintain existing file structure
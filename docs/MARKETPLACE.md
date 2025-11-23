# Web Desktop Marketplace System

A comprehensive application marketplace system for the Web Desktop environment, inspired by ArozOS module system and OS.js application framework.

## Overview

The marketplace system provides:
- **App Discovery**: Browse and search for applications
- **Installation Management**: Install, update, and uninstall apps
- **Security Scanning**: Automatic security validation and sandboxing
- **Developer Tools**: Complete development environment for creating apps
- **App Lifecycle**: Full app lifecycle management from development to deployment

## Features

### For Users
- **Browse Applications**: Discover apps by category, search, or filters
- **One-Click Installation**: Easy installation with permission management
- **Security Verification**: All apps are scanned and verified before installation
- **Automatic Updates**: Keep apps up to date with automatic update checking
- **App Management**: Launch, uninstall, and manage installed applications

### For Developers
- **Development Tools**: Built-in editor, debugger, and testing tools
- **App Templates**: Ready-to-use templates for different app types
- **Sandboxing**: Configurable sandbox environments for testing
- **Build Pipeline**: Automated build and packaging tools
- **Debug Support**: Full debugging and profiling capabilities

### System Features
- **Security**: Comprehensive security scanning and validation
- **Sandboxing**: Multiple sandbox levels for app isolation
- **Performance**: Optimized for fast loading and low memory usage
- **Scalability**: Supports hundreds of apps with efficient resource management

## Architecture

### Backend Components

#### `/api/marketplace` - Core Marketplace API
- **Apps Management**: CRUD operations for apps
- **Installation**: Download and install apps from URLs
- **Updates**: Check and install app updates
- **Security**: Security scanning and validation
- **Registry**: App metadata and version management

#### Key Files
- `backend/src/routes/marketplace.ts` - Main marketplace API
- `backend/src/routes/apps.ts` - App launching and management
- `backend/src/routes/packages.ts` - System package integration

### Frontend Components

#### UI Components
- `frontend/src/components/Marketplace.tsx` - Main marketplace interface
- `frontend/src/components/AppInstaller.tsx` - Installation wizard
- `frontend/src/components/DeveloperTools.tsx` - Development environment
- `frontend/src/components/AppLauncher.tsx` - Updated launcher with marketplace apps

#### Types and Utilities
- `frontend/src/types/applications.ts` - TypeScript definitions
- `frontend/src/utils/appDevelopment.ts` - Development utilities

### App Structure

Apps in the marketplace follow a standardized structure:

```
app-id/
├── manifest.json          # App metadata and configuration
├── metadata.json          # Installation and security metadata
├── index.html            # Web app entry point
├── src/                  # Source code (for web apps)
├── assets/               # Static assets (icons, images)
└── dist/                 # Built application
```

## App Manifest

Every app requires a `manifest.json` file:

```json
{
  "id": "my-app",
  "name": "My App",
  "version": "1.0.0",
  "description": "A sample application",
  "author": "Developer Name",
  "license": "MIT",
  "main": "index.html",
  "type": "web",
  "category": "utilities",
  "tags": ["productivity", "utility"],
  "icon": "icon.png",
  "dependencies": [
    {
      "name": "react",
      "version": "^18.0.0",
      "type": "package",
      "required": true
    }
  ],
  "permissions": [
    {
      "id": "local-storage",
      "name": "Local Storage",
      "description": "Access to browser local storage",
      "type": "user-data",
      "required": false
    }
  ],
  "compatibility": {
    "platform": "web-desktop",
    "minVersion": "1.0.0"
  }
}
```

## Installation

### Initial Setup

1. **Setup Marketplace Data**:
   ```bash
   cd backend
   npm run setup-marketplace
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Start Frontend**:
   ```bash
   cd ../frontend
   npm run dev
   ```

### Accessing the Marketplace

- Open the app launcher (Alt+Space)
- Search for "Marketplace"
- Click to open the marketplace interface

## Development

### Creating a New App

1. **Use Developer Tools**:
   - Open "Developer Tools" from app launcher
   - Create new app project
   - Use built-in templates

2. **Manual Creation**:
   ```bash
   # Create app directory
   mkdir ~/.web-desktop/marketplace/apps/my-app

   # Create manifest.json
   # See manifest example above

   # Create app files
   echo '<html><body>Hello World</body></html>' > index.html
   ```

3. **App Types**:
   - **Web Apps**: HTML/CSS/JavaScript applications
   - **Hybrid Apps**: Web apps with native integration
   - **Component Apps**: Reusable UI components

### Security Features

#### App Sandboxing
- **Full Isolation**: Complete separation from system
- **Partial Isolation**: Limited access to system resources
- **No Isolation**: Full system access (not recommended)

#### Permission System
Apps must declare required permissions:
- `file-system`: File system access
- `network`: Network connectivity
- `system`: System-level access
- `hardware`: Hardware device access
- `user-data`: User data access

#### Security Scanning
All apps are automatically scanned for:
- Malicious code patterns
- Security vulnerabilities
- Unauthorized system access
- Resource abuse

### API Reference

#### Marketplace Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/marketplace/apps` | List available apps |
| GET | `/api/marketplace/apps/:id` | Get app details |
| POST | `/api/marketplace/install` | Install app from URL |
| DELETE | `/api/marketplace/apps/:id` | Uninstall app |
| GET | `/api/marketplace/installed` | List installed apps |
| GET | `/api/marketplace/apps/:id/updates` | Check for updates |

#### App Launching

Marketplace apps can be launched through:
- App launcher (integrated with system apps)
- Direct URL: `/apps/app-id/`
- API call to `/api/apps/launch`

## Configuration

### Environment Variables

```bash
# Marketplace directory
MARKETPLACE_DIR=~/.web-desktop/marketplace

# App installation directory
APPS_DIR=$MARKETPLACE_DIR/apps

# Security scan settings
SECURITY_SCAN_ENABLED=true
SECURITY_SCAN_TIMEOUT=30000
```

### Security Settings

Configure in `backend/src/routes/marketplace.ts`:

```javascript
const SECURITY_CONFIG = {
    requireSignature: true,           // Require app signatures
    scanForMalware: true,            // Enable security scanning
    sandboxByDefault: true,          // Default to sandboxed apps
    allowedPermissions: [            // Whitelisted permissions
        'local-storage', 'network'
    ],
    blockedPermissions: [            // Blacklisted permissions
        'system-admin', 'raw-socket'
    ]
};
```

## Troubleshooting

### Common Issues

#### Apps Not Showing
1. Check marketplace data is initialized: `npm run setup-marketplace`
2. Verify API endpoints are accessible
3. Check browser console for errors

#### Installation Failures
1. Verify app URL is accessible
2. Check manifest.json format
3. Review security scan results
4. Verify disk space permissions

#### Permission Errors
1. Check app manifest permissions
2. Verify user consent during installation
3. Review sandbox configuration

#### Development Issues
1. Clear browser cache
2. Restart development servers
3. Check TypeScript compilation

### Debug Mode

Enable debug logging:
```bash
DEBUG=marketplace:* npm run dev
```

## Contributing

### Adding New Features

1. **Backend**: Add routes in `backend/src/routes/marketplace.ts`
2. **Frontend**: Create components in `frontend/src/components/`
3. **Types**: Update `frontend/src/types/applications.ts`
4. **Tests**: Add tests for new functionality

### App Development Guidelines

1. **Security**: Follow security best practices
2. **Performance**: Optimize for fast loading
3. **UX**: Use consistent UI patterns
4. **Accessibility**: Ensure accessibility compliance

## License

This marketplace system is part of the Web Desktop project and follows the same licensing terms.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the code documentation
3. Create an issue in the project repository
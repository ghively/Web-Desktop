# Security Guide

Comprehensive security documentation for Web Desktop v1.0 deployment and operation.

## 🛡️ Security Overview

Web Desktop implements multiple layers of security to protect against common threats and vulnerabilities. This guide covers security architecture, best practices, and hardening procedures for production deployments.

### Security Principles
1. **Defense in Depth**: Multiple security layers
2. **Principle of Least Privilege**: Minimal access rights
3. **Secure by Default**: Secure configurations out of the box
4. **Transparency**: Open and auditable security practices

---

## 🔐 Authentication & Authorization

### Current Authentication Status
**Version 1.0**: Web Desktop currently runs in development mode without built-in authentication. Production deployments should implement proper authentication.

### Recommended Authentication Methods

#### 1. OAuth 2.0 Integration
```typescript
// backend/src/middleware/auth.ts
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';

export const configureOAuth = (provider: string) => {
  passport.use(new OAuth2Strategy({
    authorizationURL: `https://${provider}.com/oauth/authorize`,
    tokenURL: `https://${provider}.com/oauth/token`,
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: `${process.env.BASE_URL}/auth/${provider}/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    // Verify user and create session
    const user = await findOrCreateUser(profile);
    return done(null, user);
  }));
};
```

#### 2. JWT Token Management
```typescript
// backend/src/services/auth/JWTService.ts
export class JWTService {
  private readonly secret: string;
  private readonly expiresIn: string = '1h';

  constructor(secret: string) {
    this.secret = secret;
  }

  generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
      issuer: 'webdesktop',
      audience: 'webdesktop-users'
    });
  }

  verifyToken(token: string): JWTPayload {
    return jwt.verify(token, this.secret) as JWTPayload;
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }
}
```

#### 3. Role-Based Access Control (RBAC)
```typescript
// backend/src/types/auth.ts
export interface User {
  id: string;
  username: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
}

export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

export enum Permission {
  FILE_READ = 'file:read',
  FILE_WRITE = 'file:write',
  FILE_DELETE = 'file:delete',
  SYSTEM_READ = 'system:read',
  SYSTEM_WRITE = 'system:write',
  TERMINAL_ACCESS = 'terminal:access',
  AI_MODELS = 'ai:models'
}

// Authorization middleware
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;

    if (!user || !user.permissions.includes(permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permission
      });
    }

    next();
  };
};
```

---

## 🔒 Input Validation & Sanitization

### Path Validation
```typescript
// backend/src/middleware/validate.ts
export class PathValidator {
  private static readonly ALLOWED_PATHS = [
    process.env.HOME || '/home',
    '/tmp',
    '/var/tmp',
    '/mnt'
  ];

  static validatePath(inputPath: string): string {
    if (!inputPath) {
      throw new ValidationError('Path is required');
    }

    // Remove null bytes and normalize
    const sanitized = inputPath.replace(/\0/g, '').trim();

    // Prevent directory traversal
    if (sanitized.includes('..') || sanitized.includes('~')) {
      throw new SecurityError('Invalid path: directory traversal not allowed');
    }

    // Resolve to absolute path
    const absolutePath = path.resolve(sanitized);

    // Check if path is within allowed directories
    const isAllowed = this.ALLOWED_PATHS.some(allowed =>
      absolutePath.startsWith(path.resolve(allowed))
    );

    if (!isAllowed) {
      throw new SecurityError('Access denied: path outside allowed directories');
    }

    return absolutePath;
  }
}
```

### Input Sanitization
```typescript
// backend/src/middleware/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

export class InputSanitizer {
  static sanitizeString(input: string, options?: SanitizeOptions): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Remove control characters
    let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');

    // HTML sanitization if needed
    if (options?.allowHTML !== true) {
      sanitized = DOMPurify.sanitize(sanitized);
    }

    // Length limiting
    if (options?.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    return sanitized.trim();
  }

  static sanitizeFilename(filename: string): string {
    // Remove dangerous characters
    const sanitized = filename
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/\.\./g, '_')
      .replace(/^\.+/, '')
      .substring(0, 255);

    // Ensure it's not empty
    return sanitized || 'untitled';
  }

  static validateEmail(email: string): boolean {
    return validator.isEmail(email);
  }

  static validateURL(url: string): boolean {
    return validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true
    });
  }
}
```

### SQL Injection Prevention
```typescript
// backend/src/services/database/DatabaseService.ts
export class DatabaseService {
  // Using parameterized queries to prevent SQL injection
  async getFileByPath(filePath: string): Promise<FileMetadata | null> {
    const sql = `
      SELECT * FROM file_metadata
      WHERE path = ?
      LIMIT 1
    `;

    return new Promise((resolve, reject) => {
      this.db.get(sql, [filePath], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async searchFiles(query: string, limit: number = 50): Promise<FileMetadata[]> {
    // Validate and escape search query
    const sanitizedQuery = this.escapeLikeQuery(query);
    const sql = `
      SELECT * FROM file_metadata
      WHERE name LIKE ? OR path LIKE ?
      LIMIT ?
    `;

    const searchPattern = `%${sanitizedQuery}%`;

    return new Promise((resolve, reject) => {
      this.db.all(sql, [searchPattern, searchPattern, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  private escapeLikeQuery(query: string): string {
    return query
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')
      .replace(/'/g, "''");
  }
}
```

---

## 🌐 Network Security

### HTTPS/TLS Configuration

#### Strong SSL Configuration
```nginx
# Nginx SSL Configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;

# HSTS (HTTP Strict Transport Security)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

#### Certificate Management
```bash
#!/bin/bash
# cert-renewal.sh
# Auto-renew SSL certificates

DOMAIN="your-domain.com"
EMAIL="admin@your-domain.com"

# Renew certificate
certbot renew --quiet --non-interactive

# Test nginx configuration
nginx -t

# Reload nginx if successful
if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo "SSL certificate renewed and nginx reloaded successfully"
else
    echo "Nginx configuration test failed, not reloading"
    exit 1
fi
```

### CORS Security
```typescript
// backend/src/middleware/cors.ts
import cors from 'cors';

export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    const allowedOrigins = [
      'https://your-domain.com',
      'https://www.your-domain.com'
    ];

    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization'
  ]
};

app.use(cors(corsOptions));
```

### WebSocket Security
```typescript
// backend/src/websocket/WebSocketSecurity.ts
export class WebSocketSecurity {
  private readonly allowedOrigins: string[];
  private readonly rateLimiter: Map<string, number[]> = new Map();

  constructor(allowedOrigins: string[]) {
    this.allowedOrigins = allowedOrigins;
  }

  validateConnection(req: any): boolean {
    // Origin validation
    const origin = req.headers.origin;
    if (!this.allowedOrigins.includes(origin)) {
      return false;
    }

    // Rate limiting
    const clientIP = req.connection.remoteAddress;
    if (!this.checkRateLimit(clientIP)) {
      return false;
    }

    return true;
  }

  validateMessage(data: string): boolean {
    try {
      const message = JSON.parse(data);

      // Message size limit
      if (JSON.stringify(message).length > 10000) {
        return false;
      }

      // Command validation
      if (message.type === 'terminal.input') {
        // Sanitize terminal input
        message.data = this.sanitizeTerminalInput(message.data);
      }

      return true;
    } catch {
      return false;
    }
  }

  private sanitizeTerminalInput(input: string): string {
    // Remove dangerous control characters
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  private checkRateLimit(clientIP: string): boolean {
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100;

    const requests = this.rateLimiter.get(clientIP) || [];
    const validRequests = requests.filter(time => now - time < windowMs);

    if (validRequests.length >= maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.rateLimiter.set(clientIP, validRequests);
    return true;
  }
}
```

---

## 🛡️ Application Security

### Security Headers
```typescript
// backend/src/middleware/security.ts
import helmet from 'helmet';

export const securityMiddleware = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },

  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false,

  // Other security headers
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Custom security headers
app.use((req, res, next) => {
  // X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');

  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader('Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );

  next();
});
```

### Rate Limiting
```typescript
// backend/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const createRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: 'Too many requests',
      retryAfter: Math.ceil(options.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests',
        message: options.message || 'Rate limit exceeded',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  });
};

// Different limits for different endpoints
export const rateLimits = {
  // General API limits
  general: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000 // 1000 requests per 15 minutes
  }),

  // File upload limits
  upload: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10 // 10 uploads per minute
  }),

  // Terminal limits
  terminal: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100 // 100 commands per minute
  }),

  // Authentication limits
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // 5 login attempts per 15 minutes
  })
};
```

### File Upload Security
```typescript
// backend/src/routes/files.ts
import multer from 'multer';
import path from 'path';

// Configure secure file upload
const upload = multer({
  dest: '/tmp/webdesktop-uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 10 // Max 10 files at once
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'text/plain', 'text/csv', 'application/pdf',
      'application/json', 'application/xml'
    ];

    // Blocked file types (dangerous)
    const blockedExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr',
      '.vbs', '.js', '.jar', '.app', '.deb', '.rpm',
      '.dmg', '.pkg', '.msi', '.dll', '.so', '.dylib'
    ];

    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (blockedExtensions.includes(fileExtension)) {
      return cb(new Error('File type not allowed'), false);
    }

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('MIME type not allowed'), false);
    }

    cb(null, true);
  }
});

// Virus scanning (optional, with ClamAV)
import clamd from 'clamdjs';

async function scanFile(filePath: string): Promise<boolean> {
  try {
    const scanner = clamd.createScanner('localhost', 3310);
    const result = await scanner.scanFile(filePath);
    return result.isClean();
  } catch (error) {
    console.error('Virus scan failed:', error);
    return false; // Fail secure
  }
}
```

---

## 🔍 Security Monitoring

### Security Logging
```typescript
// backend/src/services/security/SecurityLogger.ts
export class SecurityLogger {
  private static logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({
        filename: '/var/log/webdesktop/security.log'
      })
    ]
  });

  static logSecurityEvent(event: SecurityEvent): void {
    this.logger.info('Security Event', {
      type: event.type,
      severity: event.severity,
      ip: event.ip,
      userAgent: event.userAgent,
      userId: event.userId,
      details: event.details,
      timestamp: new Date().toISOString()
    });
  }

  static logAuthAttempt(
    type: 'login' | 'logout' | 'failed',
    ip: string,
    userAgent: string,
    userId?: string,
    username?: string
  ): void {
    this.logSecurityEvent({
      type: `auth.${type}`,
      severity: type === 'failed' ? 'high' : 'info',
      ip,
      userAgent,
      userId,
      details: { username }
    });
  }

  static logSuspiciousActivity(
    activity: string,
    ip: string,
    details: any
  ): void {
    this.logSecurityEvent({
      type: 'suspicious.activity',
      severity: 'high',
      ip,
      userAgent: '', // Not always available
      details: { activity, ...details }
    });
  }
}
```

### Intrusion Detection
```typescript
// backend/src/services/security/IntrusionDetection.ts
export class IntrusionDetection {
  private suspiciousPatterns = [
    /\.\./,           // Directory traversal
    /<script/i,       // XSS attempt
    /union.*select/i, // SQL injection
    /eval\(/i,        // Code injection
    /base64_decode/i, // Potential obfuscation
  ];

  detectAttack(req: Request): SecurityAlert | null {
    const alerts: SecurityAlert[] = [];

    // Check URL patterns
    const url = req.url;
    if (this.matchesSuspiciousPattern(url)) {
      alerts.push({
        type: 'suspicious_url',
        severity: 'high',
        details: { url }
      });
    }

    // Check headers
    const userAgent = req.headers['user-agent'] || '';
    if (this.isSuspiciousUserAgent(userAgent)) {
      alerts.push({
        type: 'suspicious_user_agent',
        severity: 'medium',
        details: { userAgent }
      });
    }

    // Check for SQL injection in query parameters
    const query = JSON.stringify(req.query);
    if (this.matchesSQLInjection(query)) {
      alerts.push({
        type: 'sql_injection_attempt',
        severity: 'critical',
        details: { query }
      });
    }

    return alerts.length > 0 ? alerts[0] : null;
  }

  private matchesSuspiciousPattern(input: string): boolean {
    return this.suspiciousPatterns.some(pattern => pattern.test(input));
  }

  private matchesSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /union.*select/i,
      /insert.*into/i,
      /delete.*from/i,
      /drop.*table/i,
      /exec.*sp_/i
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousAgents = [
      /sqlmap/i,
      /nmap/i,
      /nikto/i,
      /burp/i,
      /scanner/i
    ];

    return suspiciousAgents.some(pattern => pattern.test(userAgent));
  }
}
```

---

## 🔧 System Hardening

### Operating System Hardening

#### System Updates
```bash
#!/bin/bash
# system-hardening.sh

# Update system packages
apt update && apt upgrade -y

# Remove unnecessary packages
apt remove -y telnet rsh-server rsh-client
apt autoremove -y

# Configure sysctl for security
cat >> /etc/sysctl.conf << EOF
# IP Spoofing protection
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.rp_filter = 1

# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0

# Ignore send redirects
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Block SYN attacks
net.ipv4.tcp_syncookies = 1

# Log martian packets
net.ipv4.conf.all.log_martians = 1

# Ignore source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
EOF

# Apply sysctl settings
sysctl -p
```

#### File System Security
```bash
#!/bin/bash
# filesystem-security.sh

# Set secure permissions
chmod 750 /home/webdesktop
chmod 600 /home/webdesktop/.env*

# Remove world-writable permissions
find /home/webdesktop -type f -perm /002 -exec chmod 644 {} \;
find /home/webdesktop -type d -perm /002 -exec chmod 755 {} \;

# Set immutable flag on critical files
chattr +i /home/webdesktop/web-desktop/backend/dist/server.js
chattr +i /etc/systemd/system/webdesktop-*.service
```

### Firewall Configuration
```bash
#!/bin/bash
# firewall-setup.sh

# Configure UFW
ufw default deny incoming
ufw default allow outgoing

# Allow essential services
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

# Rate limiting for SSH
ufw limit ssh

# Enable logging
ufw logging on

# Enable firewall
ufw --force enable

# Fail2ban configuration
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
EOF

systemctl enable fail2ban
systemctl start fail2ban
```

---

## 🚨 Incident Response

### Security Incident Response Plan

#### Phase 1: Detection
1. **Monitoring Alerts**: Automated security alerts
2. **Log Analysis**: Regular log review
3. **User Reports**: Security incident reporting
4. **System Monitoring**: Anomaly detection

#### Phase 2: Containment
1. **Isolate System**: Disconnect from network if necessary
2. **Block IP**: Block malicious IP addresses
3. **Disable Accounts**: Suspend compromised accounts
4. **Preserve Evidence**: Collect forensic data

#### Phase 3: Eradication
1. **Remove Malware**: Clean infected systems
2. **Patch Vulnerabilities**: Apply security patches
3. **Reset Credentials**: Change all passwords
4. **Update Configurations**: Fix security misconfigurations

#### Phase 4: Recovery
1. **Restore from Backup**: Restore clean data
2. **Verify Systems**: Ensure systems are clean
3. **Monitor**: Watch for recurring issues
4. **Document**: Document lessons learned

### Incident Response Scripts

#### Automated Response Script
```bash
#!/bin/bash
# incident-response.sh

ALERT_TYPE=$1
IP_ADDRESS=$2
USER_ID=$3

case $ALERT_TYPE in
  "brute_force")
    # Block IP for brute force attack
    iptables -A INPUT -s $IP_ADDRESS -j DROP
    logger "Blocked IP $IP_ADDRESS due to brute force attack"
    ;;

  "suspicious_activity")
    # Temporarily block IP
    iptables -A INPUT -s $IP_ADDRESS -j DROP -m comment --comment "temp_block"
    logger "Temporarily blocked IP $IP_ADDRESS for suspicious activity"
    ;;

  "compromise")
    # Disable user account
    usermod -L $USER_ID
    logger "Disabled user account $USER_ID due to compromise"
    ;;
esac

# Send alert
curl -X POST \
  -H 'Content-Type: application/json' \
  -d "{\"text\":\"Security alert: $ALERT_TYPE from $IP_ADDRESS\"}" \
  $SLACK_WEBHOOK_URL
```

---

## 📋 Security Checklist

### Pre-Deployment Security Checklist
- [ ] Authentication system configured
- [ ] SSL/TLS certificates installed
- [ ] Security headers implemented
- [ ] Input validation enabled
- [ ] Rate limiting configured
- [ ] File upload restrictions in place
- [ ] Database security configured
- [ ] Logging and monitoring enabled
- [ ] Firewall rules configured
- [ ] Security scan completed
- [ ] Penetration testing performed
- [ ] Backup encryption enabled

### Ongoing Security Checklist
- [ ] Security patches applied regularly
- [ ] SSL certificates renewed
- [ ] Security logs reviewed daily
- [ ] User access reviewed monthly
- [ ] Security scans performed weekly
- [ ] Incident response plan tested quarterly
- [ ] Security training conducted annually

### Security Monitoring
- [ ] Failed login attempts monitored
- [ ] Unusual file access patterns detected
- [ ] Network traffic anomalies identified
- [ ] System resource usage monitored
- [ ] File integrity checking enabled
- [ ] Vulnerability scanning performed

---

## 🔍 Security Auditing

### Security Audit Script
```bash
#!/bin/bash
# security-audit.sh

echo "=== Web Desktop Security Audit ==="
echo "Date: $(date)"
echo

# Check system updates
echo "=== System Updates ==="
apt list --upgradable 2>/dev/null | grep -v "WARNING"

# Check SSL certificate
echo "=== SSL Certificate ==="
if [ -f /etc/ssl/certs/webdesktop.crt ]; then
    openssl x509 -in /etc/ssl/certs/webdesktop.crt -noout -dates
else
    echo "SSL certificate not found"
fi

# Check firewall status
echo "=== Firewall Status ==="
ufw status

# Check running services
echo "=== Running Services ==="
systemctl list-units --type=service --state=running | grep webdesktop

# Check file permissions
echo "=== File Permissions ==="
find /home/webdesktop -type f -perm /002 -ls 2>/dev/null | head -10

# Check for world-writable directories
echo "=== World-Writable Directories ==="
find /home/webdesktop -type d -perm /002 -ls 2>/dev/null | head -10

# Check security logs
echo "=== Recent Security Events ==="
tail -20 /var/log/webdesktop/security.log 2>/dev/null || echo "No security log found"

echo "=== Audit Complete ==="
```

---

This security guide provides comprehensive security measures for Web Desktop deployments. Regular security reviews and updates are essential for maintaining a secure environment.
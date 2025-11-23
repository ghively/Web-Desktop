import { CatppuccinTheme, WallpaperDisplayMode } from '../context/settingsTypes';
import { API_CONFIG } from '../config/api';

// Enhanced comprehensive settings interfaces for a full web desktop experience

// Cross-platform helper to get platform-specific paths
const getPlatformSpecificPaths = () => {
    // Browser-based platform detection
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const platform = typeof navigator !== 'undefined' ? navigator.platform : '';

    const isWindows = userAgent.includes('Windows') || platform.includes('Win');

    if (isWindows) {
        return {
            dockerSocket: 'npipe://./pipe/docker_engine',
            defaultHomePath: 'C:\\Users\\User',
            tempPath: 'C:\\Users\\User\\AppData\\Local\\Temp',
            sharePath: 'C:\\Temp\\Shares'
        };
    } else {
        return {
            dockerSocket: '/var/run/docker.sock',
            defaultHomePath: '/home/user',
            tempPath: '/tmp',
            sharePath: '/tmp/shares'
        };
    }
};

export interface SystemSettings {
  hostname: string;
  timezone: string;
  language: string;
  region: string;
  dateTime: {
    format24h: boolean;
    showSeconds: boolean;
    dateFormat: 'mm/dd/yyyy' | 'dd/mm/yyyy' | 'yyyy-mm-dd';
  };
  autoUpdates: boolean;
  updateChannel: 'stable' | 'beta' | 'dev';
  systemSounds: boolean;
  animations: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  shell: string;
  homeDirectory: string;
  uid?: number;
  gid?: number;
  lastLogin?: Date;
  createdAt: Date;
  isActive: boolean;
  permissions: UserPermissions;
}

export interface UserPermissions {
  canAccessTerminal: boolean;
  canManageFiles: boolean;
  canManageUsers: boolean;
  canManageSystem: boolean;
  canManageNetwork: boolean;
  canManageStorage: boolean;
  canInstallApps: boolean;
  canViewSystemInfo: boolean;
}

export interface UserManagementSettings {
  defaultShell: string;
  availableShells: string[];
  sessionTimeout: number; // minutes
  passwordPolicy: PasswordPolicy;
  userQuotas: UserQuotas;
  allowGuestAccess: boolean;
  requireStrongPasswords: boolean;
  sessionLocking: boolean;
  maxConcurrentSessions: number;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  passwordHistory: number; // number of previous passwords to remember
  maxAge: number; // days
}

export interface UserQuotas {
  enabled: boolean;
  defaultDiskQuota: number; // bytes
  maxFileSize: number; // bytes
  allowQuotaOverride: boolean;
}

export interface NetworkSettings {
  hostname: string;
  domain: string;
  dnsServers: string[];
  searchDomains: string[];
  proxy: ProxySettings;
  firewall: FirewallSettings;
  interfaces: NetworkInterface[];
  vpn: VPNSettings;
}

export interface ProxySettings {
  enabled: boolean;
  httpProxy?: string;
  httpsProxy?: string;
  socksProxy?: string;
  noProxy: string[];
  authentication?: {
    username: string;
    password: string;
  };
}

export interface FirewallSettings {
  enabled: boolean;
  defaultPolicy: 'allow' | 'deny';
  rules: FirewallRule[];
  blocklist: string[];
  logging: boolean;
}

export interface FirewallRule {
  id: string;
  name: string;
  action: 'allow' | 'deny' | 'log';
  protocol: 'tcp' | 'udp' | 'icmp' | 'any';
  sourceIp: string;
  sourcePort?: number;
  destIp: string;
  destPort?: number;
  direction: 'inbound' | 'outbound' | 'both';
  enabled: boolean;
  priority: number;
}

export interface NetworkInterface {
  name: string;
  type: 'ethernet' | 'wifi' | 'bridge';
  status: 'up' | 'down';
  ipAddress: string;
  netmask: string;
  gateway: string;
  macAddress: string;
  mtu: number;
  isPrimary: boolean;
}

export interface VPNSettings {
  enabled: boolean;
  type: 'openvpn' | 'wireguard' | 'ipsec';
  configurations: VPNConfig[];
  autoConnect: boolean;
  killSwitch: boolean;
}

export interface VPNConfig {
  id: string;
  name: string;
  server: string;
  port: number;
  protocol: string;
  config?: string; // base64 encoded config file
  username?: string;
  password?: string;
  autoConnect: boolean;
}

export interface StorageSettings {
  volumes: StorageVolume[];
  backup: BackupSettings;
  quotas: StorageQuotas;
  compression: CompressionSettings;
  encryption: EncryptionSettings;
}

export interface StorageVolume {
  id: string;
  name: string;
  path: string;
  type: 'local' | 'network' | 'usb' | 'cloud';
  mountPoint: string;
  fileSystem: string;
  totalSize: number; // bytes
  usedSize: number; // bytes
  availableSize: number; // bytes;
  isMounted: boolean;
  mountOnBoot: boolean;
  options: string[];
}

export interface BackupSettings {
  enabled: boolean;
  schedule: BackupSchedule;
  destinations: BackupDestination[];
  retention: RetentionPolicy;
  encryption: boolean;
  compression: boolean;
  excludePatterns: string[];
}

export interface BackupSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  time: string; // HH:MM
  dayOfWeek?: number; // 0-6
  dayOfMonth?: number; // 1-31
}

export interface BackupDestination {
  id: string;
  type: 'local' | 'sftp' | 's3' | 'webdav';
  name: string;
  path: string;
  credentials?: {
    username: string;
    password: string;
  };
  config?: Record<string, any>;
}

export interface RetentionPolicy {
  daily: number; // keep last N daily backups
  weekly: number; // keep last N weekly backups
  monthly: number; // keep last N monthly backups
  maxAge: number; // days
}

export interface StorageQuotas {
  enabled: boolean;
  users: UserQuota[];
  defaultQuota: number; // bytes
}

export interface UserQuota {
  userId: string;
  username: string;
  quota: number; // bytes
  used: number; // bytes
  softLimit: number; // bytes
  gracePeriod: number; // days
}

export interface CompressionSettings {
  enabled: boolean;
  algorithm: 'gzip' | 'lz4' | 'zstd';
  level: number; // 1-9
}

export interface EncryptionSettings {
  enabled: boolean;
  algorithm: 'aes-256-cbc' | 'aes-256-gcm' | 'chacha20-poly1305';
  keyRotationDays: number;
}

export interface SecuritySettings {
  authentication: AuthenticationSettings;
  apiKeys: APIKeySettings;
  certificates: CertificateSettings;
  auditing: AuditingSettings;
  securityPolicy: SecurityPolicy;
}

export interface AuthenticationSettings {
  method: 'password' | 'ldap' | 'oauth' | '2fa' | 'certificate';
  twoFactorAuth: TwoFactorSettings;
  sessionManagement: SessionManagementSettings;
  passwordAuth: PasswordAuthSettings;
  ldapConfig?: LDAPConfig;
  oauthConfig?: OAuthConfig;
}

export interface TwoFactorSettings {
  enabled: boolean;
  required: boolean;
  methods: ('totp' | 'sms' | 'email' | 'hardware-key')[];
  backupCodes: boolean;
  recoveryEmail?: string;
}

export interface SessionManagementSettings {
  timeout: number; // minutes
  maxConcurrentSessions: number;
  secureCookies: boolean;
  sameSitePolicy: 'strict' | 'lax' | 'none';
  rememberMeDuration: number; // days
}

export interface PasswordAuthSettings {
  minPasswordLength: number;
  passwordComplexity: boolean;
  passwordHistory: number;
  failedAttemptsLockout: number;
  lockoutDuration: number; // minutes
}

export interface LDAPConfig {
  url: string;
  bindDN: string;
  bindPassword: string;
  userBaseDN: string;
  userFilter: string;
  groupBaseDN: string;
  groupFilter: string;
  useTLS: boolean;
  verifyCertificate: boolean;
}

export interface OAuthConfig {
  provider: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string[];
}

export interface APIKeySettings {
  enabled: boolean;
  keys: APIKey[];
  defaultExpiry: number; // days
  rateLimiting: RateLimitSettings;
}

export interface APIKey {
  id: string;
  name: string;
  key: string; // masked in UI
  permissions: string[];
  createdAt: Date;
  expiresAt?: Date;
  lastUsed?: Date;
  isActive: boolean;
  createdBy: string;
  allowedIPs: string[];
  rateLimitPerHour: number;
}

export interface RateLimitSettings {
  enabled: boolean;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
}

export interface CertificateSettings {
  enabled: boolean;
  certificates: Certificate[];
  autoRenewal: boolean;
  renewalDays: number;
  acmeSettings: ACMESettings;
}

export interface Certificate {
  id: string;
  name: string;
  type: 'self-signed' | 'ca-signed' | 'lets-encrypt' | 'imported';
  domain: string;
  issuer: string;
  validFrom: Date;
  validUntil: Date;
  keySize: number;
  algorithm: string;
  certificatePath: string;
  keyPath: string;
  chainPath?: string;
  isActive: boolean;
  autoRenew: boolean;
}

export interface ACMESettings {
  email: string;
  provider: string;
  staging: boolean;
  accountKey?: string;
  challengeType: 'http-01' | 'dns-01' | 'tls-alpn-01';
}

export interface AuditingSettings {
  enabled: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  logRetention: number; // days
  auditEvents: AuditEvent[];
  exportSettings: ExportSettings;
}

export interface AuditEvent {
  id: string;
  category: 'authentication' | 'authorization' | 'system' | 'network' | 'storage' | 'application';
  action: string;
  resource?: string;
  user?: string;
  ip: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
}

export interface ExportSettings {
  format: 'json' | 'csv' | 'syslog';
  destination: 'file' | 'syslog' | 'webhook' | 'email';
  config?: Record<string, any>;
}

export interface SecurityPolicy {
  passwordMinLength: number;
  passwordComplexity: boolean;
  sessionTimeout: number;
  maxFailedAttempts: number;
  lockoutDuration: number;
  require2FA: boolean;
  ipWhitelist: string[];
  ipBlacklist: string[];
  allowedCountries: string[];
  blockedCountries: string[];
}

export interface AdvancedSettings {
  modules: ModuleSettings;
  services: ServiceSettings;
  performance: PerformanceSettings;
  development: DevelopmentSettings;
  experimental: ExperimentalSettings;
}

export interface ModuleSettings {
  installedModules: Module[];
  enabledModules: string[];
  moduleSettings: Record<string, any>;
  autoUpdate: boolean;
  repository: string[];
}

export interface Module {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  dependencies: string[];
  settings?: any;
  isEnabled: boolean;
  isInstalled: boolean;
  updateAvailable?: string;
  size: number; // bytes
  installDate?: Date;
}

export interface ServiceSettings {
  services: Service[];
  systemServices: SystemService[];
  startupOrder: string[];
}

export interface Service {
  id: string;
  name: string;
  type: 'systemd' | 'init' | 'custom';
  status: 'running' | 'stopped' | 'failed' | 'unknown';
  enabled: boolean;
  autoStart: boolean;
  dependencies: string[];
  pid?: number;
  memoryUsage?: number; // bytes
  cpuUsage?: number; // percentage
  uptime?: number; // seconds
  restartCount: number;
  lastRestart?: Date;
  logFile?: string;
  config?: Record<string, any>;
}

export interface SystemService {
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'failed';
  enabled: boolean;
  loaded: boolean;
  vendor?: string;
  documentation?: string;
}

export interface PerformanceSettings {
  maxMemory: number; // MB
  maxCPU: number; // percentage
  ioPriority: number; // 0-7
  niceLevel: number; // -20 to 19
  ulimits: Record<string, number>;
  caching: CachingSettings;
}

export interface CachingSettings {
  enabled: boolean;
  type: 'memory' | 'disk' | 'redis' | 'memcached';
  size: number; // MB
  ttl: number; // seconds
  config?: Record<string, any>;
}

export interface DevelopmentSettings {
  debugMode: boolean;
  verboseLogging: boolean;
  developerMode: boolean;
  experimentalFeatures: boolean;
  apiDocumentation: boolean;
  testMode: boolean;
  mockData: boolean;
}

export interface ExperimentalSettings {
  enabled: boolean;
  features: ExperimentalFeature[];
  betaChannel: boolean;
  telemetry: boolean;
  crashReporting: boolean;
}

export interface ExperimentalFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  risk: 'low' | 'medium' | 'high';
  requirements?: string[];
  settings?: Record<string, any>;
}

// Main comprehensive settings interface
export interface ComprehensiveSettings {
  // Enhanced desktop settings
  desktop: {
    theme: CatppuccinTheme;
    wallpaper: {
      type: 'image' | 'gradient' | 'slideshow';
      imageUrl?: string;
      images?: string[]; // for slideshow
      gradient?: string;
      displayMode: WallpaperDisplayMode;
      slideshowInterval?: number; // seconds
    };
    iconSize: 'small' | 'medium' | 'large';
    fontSize: 'small' | 'medium' | 'large';
    windowOpacity: number;
    animations: boolean;
    sounds: boolean;
    showDesktopIcons: boolean;
    taskbarPosition: 'bottom' | 'top' | 'left' | 'right';
    autoHideTaskbar: boolean;
  };

  // System settings
  system: SystemSettings;

  // User management
  users: UserManagementSettings;

  // Network configuration
  network: NetworkSettings;

  // Storage management
  storage: StorageSettings;

  // Security configuration
  security: SecuritySettings;

  // Advanced settings
  advanced: AdvancedSettings;

  // Backend configuration
  backend: {
    apiUrl: string;
    wsUrl: string;
    vncUrl: string;
    dockerSocket?: string;
    defaultHomePath: string;
    tempPath: string;
    sharePath: string;
  };
}

// Default comprehensive settings
export const defaultComprehensiveSettings: ComprehensiveSettings = {
  desktop: {
    theme: 'mocha',
    wallpaper: {
      type: 'gradient',
      gradient: 'linear-gradient(135deg, #1e1e2e 0%, #181825 50%, #11111b 100%)',
      displayMode: 'cover'
    },
    iconSize: 'medium',
    fontSize: 'medium',
    windowOpacity: 0.95,
    animations: true,
    sounds: true,
    showDesktopIcons: true,
    taskbarPosition: 'bottom',
    autoHideTaskbar: false
  },

  system: {
    hostname: 'webdesktop',
    timezone: 'UTC',
    language: 'en',
    region: 'US',
    dateTime: {
      format24h: true,
      showSeconds: false,
      dateFormat: 'mm/dd/yyyy'
    },
    autoUpdates: true,
    updateChannel: 'stable',
    systemSounds: true,
    animations: true
  },

  users: {
    defaultShell: '/bin/bash',
    availableShells: ['/bin/bash', '/bin/zsh', '/bin/fish'],
    sessionTimeout: 60,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: false,
      passwordHistory: 5,
      maxAge: 90
    },
    userQuotas: {
      enabled: false,
      defaultDiskQuota: 10737418240, // 10GB
      maxFileSize: 1073741824, // 1GB
      allowQuotaOverride: true
    },
    allowGuestAccess: false,
    requireStrongPasswords: true,
    sessionLocking: true,
    maxConcurrentSessions: 3
  },

  network: {
    hostname: 'webdesktop',
    domain: '',
    dnsServers: ['8.8.8.8', '8.8.4.4'],
    searchDomains: [],
    proxy: {
      enabled: false,
      noProxy: []
    },
    firewall: {
      enabled: false,
      defaultPolicy: 'allow',
      rules: [],
      blocklist: [],
      logging: false
    },
    interfaces: [],
    vpn: {
      enabled: false,
      type: 'openvpn',
      configurations: [],
      autoConnect: false,
      killSwitch: false
    }
  },

  storage: {
    volumes: [],
    backup: {
      enabled: false,
      schedule: {
        frequency: 'daily',
        time: '02:00'
      },
      destinations: [],
      retention: {
        daily: 7,
        weekly: 4,
        monthly: 12,
        maxAge: 365
      },
      encryption: true,
      compression: true,
      excludePatterns: ['*.tmp', '*.log', 'cache/']
    },
    quotas: {
      enabled: false,
      users: [],
      defaultQuota: 10737418240 // 10GB
    },
    compression: {
      enabled: false,
      algorithm: 'gzip',
      level: 6
    },
    encryption: {
      enabled: false,
      algorithm: 'aes-256-cbc',
      keyRotationDays: 90
    }
  },

  security: {
    authentication: {
      method: 'password',
      twoFactorAuth: {
        enabled: false,
        required: false,
        methods: ['totp'],
        backupCodes: true
      },
      sessionManagement: {
        timeout: 60,
        maxConcurrentSessions: 3,
        secureCookies: true,
        sameSitePolicy: 'strict',
        rememberMeDuration: 30
      },
      passwordAuth: {
        minPasswordLength: 8,
        passwordComplexity: true,
        passwordHistory: 5,
        failedAttemptsLockout: 5,
        lockoutDuration: 15
      }
    },
    apiKeys: {
      enabled: true,
      keys: [],
      defaultExpiry: 30,
      rateLimiting: {
        enabled: true,
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        burstLimit: 10
      }
    },
    certificates: {
      enabled: false,
      certificates: [],
      autoRenewal: true,
      renewalDays: 30,
      acmeSettings: {
        email: '',
        provider: 'letsencrypt',
        staging: false,
        challengeType: 'http-01'
      }
    },
    auditing: {
      enabled: true,
      logLevel: 'info',
      logRetention: 90,
      auditEvents: [],
      exportSettings: {
        format: 'json',
        destination: 'file'
      }
    },
    securityPolicy: {
      passwordMinLength: 8,
      passwordComplexity: true,
      sessionTimeout: 60,
      maxFailedAttempts: 5,
      lockoutDuration: 15,
      require2FA: false,
      ipWhitelist: [],
      ipBlacklist: [],
      allowedCountries: [],
      blockedCountries: []
    }
  },

  advanced: {
    modules: {
      installedModules: [],
      enabledModules: [],
      moduleSettings: {},
      autoUpdate: true,
      repository: []
    },
    services: {
      services: [],
      systemServices: [],
      startupOrder: []
    },
    performance: {
      maxMemory: 2048,
      maxCPU: 80,
      ioPriority: 4,
      niceLevel: 0,
      ulimits: {},
      caching: {
        enabled: true,
        type: 'memory',
        size: 256,
        ttl: 300
      }
    },
    development: {
      debugMode: false,
      verboseLogging: false,
      developerMode: false,
      experimentalFeatures: false,
      apiDocumentation: false,
      testMode: false,
      mockData: false
    },
    experimental: {
      enabled: false,
      features: [],
      betaChannel: false,
      telemetry: false,
      crashReporting: false
    }
  },

  backend: {
    ...API_CONFIG,
    ...getPlatformSpecificPaths()
  }
};

import fs from 'fs';
import os from 'os';
import path from 'path';

const HOME_DIR = os.homedir();

const getPlatformSpecificPaths = (): { tempDirs: string[]; allowedSystemPaths: string[] } => {
  const isWindows = os.platform() === 'win32';
  const tempDir = os.tmpdir();

  if (isWindows) {
    return {
      tempDirs: [
        tempDir,
        path.join(process.env.TEMP || 'C:\\Windows\\Temp'),
        path.join(process.env.TMP || 'C:\\Windows\\Temp')
      ].filter(Boolean) as string[],
      allowedSystemPaths: [
        'C:\\Temp',
        'C:\\Tmp',
        'C:\\Windows\\Temp',
        'D:\\Temp',
        'D:\\Tmp'
      ]
    };
  }

  return {
    tempDirs: [
      tempDir,
      '/tmp',
      '/var/tmp'
    ],
    allowedSystemPaths: [
      tempDir,
      '/tmp',
      '/var/tmp',
      '/mnt',
      '/media'
    ]
  };
};

const PLATFORM_PATHS = getPlatformSpecificPaths();

export const validatePath = (inputPath: string): string | null => {
  if (!inputPath || typeof inputPath !== 'string') {
    return null;
  }

  const sanitized = inputPath.replace(/[\x00-\x1F\x7F]/g, '');

  const traversalPatterns = [
    '../',
    '..\\',
    '..',
    '%2e%2e%2f',
    '%2e%2e%5c',
    '%2e%2e/',
    '%2e%2e\\',
    '..%2f',
    '..%5c',
    '%2e%2e%2e%2f',
    '%2e%2e%2e%5c',
    '....//',
    '....\\\\'
  ];

  const hasTraversal = traversalPatterns.some(pattern =>
    sanitized.toLowerCase().includes(pattern)
  );

  if (hasTraversal) {
    return null;
  }

  const pathComponents = sanitized.split(/[\\/]/);
  if (pathComponents.some(component => component === '.' || component === '..')) {
    return null;
  }

  if (sanitized.startsWith('/') || /^[A-Za-z]:/.test(sanitized)) {
    const allowedAbsolutePrefixes = PLATFORM_PATHS.allowedSystemPaths;
    const isAllowedAbsolute = allowedAbsolutePrefixes.some(prefix =>
      sanitized.startsWith(prefix)
    );

    if (!isAllowedAbsolute) {
      return null;
    }
  }

  const resolvedPath = path.resolve(sanitized);
  const homeResolved = path.resolve(HOME_DIR);

  const allowedPaths = [
    homeResolved,
    ...PLATFORM_PATHS.allowedSystemPaths
  ];

  const isAllowed = allowedPaths.some(allowed => {
    const normalizedAllowed = path.normalize(allowed);
    const normalizedResolved = path.normalize(resolvedPath);

    return normalizedResolved === normalizedAllowed ||
      (normalizedResolved.startsWith(normalizedAllowed) &&
        (normalizedAllowed === '/' || normalizedResolved[normalizedAllowed.length] === '/' ||
          normalizedAllowed.length === normalizedResolved.length));
  });

  if (!isAllowed) {
    return null;
  }

  return resolvedPath;
};

export const ensureDirectoryExists = (inputPath: string): string => {
  const validatedPath = validatePath(inputPath);
  if (!validatedPath) {
    throw new Error('Invalid path');
  }

  if (fs.existsSync(validatedPath)) {
    const stats = fs.statSync(validatedPath);
    if (!stats.isDirectory()) {
      throw new Error('Path exists and is not a directory');
    }
    return validatedPath;
  }

  fs.mkdirSync(validatedPath, { recursive: true });
  return validatedPath;
};

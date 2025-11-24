/// <reference types="vite/client" />
/// <reference lib="dom" />

interface RequestInit {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit;
  mode?: RequestMode;
  credentials?: RequestCredentials;
  cache?: RequestCache;
  redirect?: RequestRedirect;
  referrer?: string;
  referrerPolicy?: string;
}

interface HeadersInit {
  [key: string]: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface BodyInit {
  /* Browser BodyInit types */
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RequestMode {
  /* Browser RequestMode types */
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RequestCredentials {
  /* Browser RequestCredentials types */
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RequestCache {
  /* Browser RequestCache types */
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RequestRedirect {
  /* Browser RequestRedirect types */
}

declare global {
  interface Window {
    // Web Vite client extensions
    __APP_VERSION__: string;
  }

  var process: {
    env: Record<string, string | undefined>;
  };

  var NodeJS: {
    Timeout: ReturnType<typeof setTimeout>;
  };

  var FrameRequestCallback: (timestamp: number) => void;

  var global: typeof globalThis;

  var NodeListOf: {
    new (): NodeList;
    prototype: NodeList;
  }

  var Buffer: {
    from(data: string | ArrayBuffer | Uint8Array, encoding?: string): Buffer;
    alloc(size: number): Buffer;
    byteLength(string: string, encoding?: string): number;
    isBuffer(obj: unknown): boolean;
  };

  interface Buffer {
    length: number;
    toString(encoding?: string): string;
    toJSON(): { type: 'Buffer', data: number[] };
    write(string: string, offset?: number, length?: number, encoding?: string): number;
    slice(start?: number, end?: number): Buffer;
    copy(targetBuffer: Buffer, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;
  }

  var EventListener: (evt: Event) => void;

  var Headers: {
    new(init?: HeadersInit): Headers;
    prototype: Headers;
  };

  var Request: {
    new(input: string | Request, init?: RequestInit): Request;
    prototype: Request;
  };

  var Response: {
    new(body?: BodyInit | null, init?: ResponseInit): Response;
    prototype: Response;
  };

  interface ResponseInit {
    status?: number;
    statusText?: string;
    headers?: HeadersInit;
  }
}

export {};
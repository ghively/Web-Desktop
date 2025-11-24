/// <reference types="vite/client" />
/// <reference types="dom" />

// Global DOM API types
declare type DOMHighResTimeStamp = number;

// Global Node.js types
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const Buffer: {
  from(data: string | ArrayBuffer, encoding?: string): ArrayBuffer;
  alloc(size: number): ArrayBuffer;
  isBuffer(obj: unknown): boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Window {
  process: {
    env: {
      [key: string]: string | undefined;
    };
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const process: {
  env: {
    [key: string]: string | undefined;
    HOME?: string;
    NODE_ENV?: string;
  };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const __dirname: string;

declare global {
  const process: {
    env: {
      [key: string]: string | undefined;
      HOME?: string;
      NODE_ENV?: string;
    };
  };

  const __dirname: string;

   
  const React: unknown;
   
  const ReactDOM: unknown;

  interface NodeJS {
    Timeout: number;
    Immediate: number;
  }

  interface Window {
    process: {
      env: {
        [key: string]: string | undefined;
      };
    };
  }

  type NodeListOf<T extends Node> = T[];
  type FrameRequestCallback = (time: DOMHighResTimeStamp) => void;
}

export {};
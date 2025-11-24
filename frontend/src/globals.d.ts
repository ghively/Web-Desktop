/// <reference types="vite/client" />
/// <reference types="dom" />

interface Window {
  process: {
    env: {
      [key: string]: string | undefined;
    };
  };
}

declare const process: {
  env: {
    [key: string]: string | undefined;
    HOME?: string;
    NODE_ENV?: string;
  };
};

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

  const React: any;
  const ReactDOM: any;

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
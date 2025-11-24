/// <reference types="vite/client" />

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

  var RequestInit: RequestInit;
  var ReferrerPolicy: ReferrerPolicy;

  var NodeListOf: {
    new <T extends Node>(): NodeList;
    prototype: NodeList;
  }
}

export {};
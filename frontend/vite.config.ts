import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import autoprefixer from 'autoprefixer'

/// <reference types="node" />

// Import process type
declare const process: {
  env: {
    [key: string]: string | undefined;
    npm_package_version?: string;
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Add JSX runtime for better compatibility
      jsxRuntime: 'automatic',
    }),
  ],
  server: {
    host: '0.0.0.0', // Allow external connections
    allowedHosts: ['localhost', '127.0.0.1', 'gh-srv'], // Allow gh-srv host
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
    // Enable CORS for development
    cors: true,
  },
  // Define constants that can be imported in the code
  define: {
    // Make environment variables available at build time
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    // Global type definitions
    global: 'globalThis',
  },
  build: {
    // Generate source maps for debugging
    sourcemap: true,
    chunkSizeWarningLimit: 2000,
    // Target browsers for transpilation
    target: [
      'es2020', // Base ECMAScript target
      'chrome108', // Chrome 108+
      'firefox107', // Firefox 107+
      'safari16', // Safari 16+
      'edge108', // Edge 108+
    ],
    // Define browser compatibility range
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          xterm: ['@xterm/xterm', '@xterm/addon-fit'],
          ui: ['framer-motion', 'lucide-react', 'react-rnd'],
          charts: ['recharts'],
          radix: ['@radix-ui/react-slot', '@radix-ui/react-tabs', '@radix-ui/react-progress'],
        },
      },
    },
    // Enable minification with better compatibility
    minify: 'terser',
    terserOptions: {
      compress: {
        // Disable certain optimizations that can cause issues in older browsers
        arrows: false,
        collapse_vars: false,
        comparisons: false,
        computed_props: false,
        hoist_funs: false,
        hoist_props: false,
        hoist_vars: false,
        inline: false,
        loops: false,
        negate_iife: false,
        properties: false,
        reduce_funcs: false,
        reduce_vars: false,
        switches: false,
        typeofs: false,
      },
      mangle: {
        safari10: true, // Safari 10 compatibility
      },
      format: {
        comments: false,
      },
    },
    // Asset optimization
    cssCodeSplit: true,
    cssTarget: ['chrome108', 'firefox107', 'safari16', 'edge108'],
  },
  // CSS configuration for better compatibility
  css: {
    postcss: {
      plugins: [
        // Tailwind includes Autoprefixer by default, but we ensure it here
        autoprefixer({
          grid: true, // Enable CSS Grid prefixes
          flexbox: true, // Enable Flexbox prefixes
          supports: true, // Enable @supports prefixes
        }),
      ],
    },
    devSourcemap: true,
  },
  // Optimize dependencies for better performance
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-rnd',
      'framer-motion',
      'lucide-react',
      '@xterm/xterm',
      '@xterm/addon-fit',
    ],
  },
  // Environment variables configuration
  envPrefix: 'VITE_',
  // Preview server configuration
  preview: {
    port: 4173,
    cors: true,
  },
})
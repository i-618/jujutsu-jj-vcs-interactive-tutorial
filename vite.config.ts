import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

const packageJson = JSON.parse(
  fs.readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
) as {homepage?: string};

function getBasePath(homepage?: string): string {
  if (!homepage) {
    return '/';
  }

  try {
    return new URL(homepage).pathname || '/';
  } catch {
    return homepage.startsWith('/') ? homepage : `/${homepage}`;
  }
}

export default defineConfig(({command}) => {
  return {
    base: command === 'build' ? getBasePath(packageJson.homepage) : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'docs',
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
    sourcemapIgnoreList(sourcePath) {
      return sourcePath.includes('node_modules');
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});

import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three-core', test: /[/\\]three\.core\.js$/ },
            { name: 'three-renderer', test: /[/\\]three\.module\.js$/ },
          ],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app'],
    proxy: { '/api': 'http://localhost:8787' },
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app'],
    proxy: { '/api': 'http://localhost:8787' },
  },
});

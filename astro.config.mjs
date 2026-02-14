import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://rehamagentgram.io',
  output: 'static',
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    mdx(),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
  server: {
    host: true,
  },
  vite: {
    server: {
      allowedHosts: true,
      strictPort: false,
    },
    optimizeDeps: {
      exclude: ['fsevents'],
    },
  },
});

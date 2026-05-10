import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'https://radar-subvenciones.es',
  output: 'server',
  adapter: vercel(),
  integrations: [],
  vite: {
    plugins: [tailwindcss()]
  }
});

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Pages from 'vite-plugin-pages';
import VueRouter from 'unplugin-vue-router/vite';
import { visualizer } from "rollup-plugin-visualizer";
import * as path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    VueRouter({ routesFolder: 'src/pages' }),
    vue(),
    Pages({
      dirs: 'src/pages', 
      extensions: ['vue'], 
    }),
    visualizer()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    hmr: true,
    watch: {
        usePolling: true,
    },
},
});


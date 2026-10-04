import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        /*
         * O Bootstrap 5.3 ainda é escrito com `@import` e com funções de cor
         * antigas do Sass, que o Dart Sass moderno marca como obsoletas. Os
         * avisos são dele, não nossos, e some centenas de linhas a cada build
         * esconderiam um aviso de verdade. `quietDeps` cala o que vem de
         * node_modules; a lista cobre o `@import` do nosso próprio arquivo,
         * que só sai quando o Bootstrap 6 migrar para `@use`.
         */
        quietDeps: true,
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'mixed-decls'],
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  /*
   * Em desenvolvimento a API roda à parte (`npm run dev:api`, porta 3000) e o
   * Vite repassa a ela o que em produção o Nginx repassa. Mesma origem nos dois
   * casos: o cookie de sessão e a checagem de origem funcionam igual.
   */
  server: {
    proxy: {
      '/api': { target: process.env.API_URL ?? 'http://localhost:3000' },
      '/arquivos': { target: process.env.API_URL ?? 'http://localhost:3000' },
    },
  },
})

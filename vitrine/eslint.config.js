import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.smoke']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    /*
     * As primitivas de UI seguem o padrão shadcn/ui: cada arquivo exporta os
     * componentes junto com o reexport da primitiva Radix (`export const Dialog
     * = DialogPrimitive.Root`) e as variantes de classe. Isso invalida o Fast
     * Refresh só desses arquivos — que raramente são editados com a aplicação
     * rodando —, então a regra é desligada aqui em vez de fragmentar cada
     * componente em dois arquivos.
     *
     * O mesmo vale para o contexto de autenticação (Provider + hook `useAuth`)
     * e para o mapa de ícones de categoria.
     */
    files: [
      'src/components/ui/**/*.jsx',
      'src/contexts/**/*.jsx',
      'src/components/common/CategoryIcon.jsx',
      'src/routes/**/*.jsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Scripts de build rodam no Node, não no navegador.
    files: ['scripts/**/*.{js,jsx,mjs}', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'react-refresh/only-export-components': 'off',
      'no-console': 'off',
    },
  },
])

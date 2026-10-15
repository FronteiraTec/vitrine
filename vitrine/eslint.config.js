import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.smoke', 'server/node_modules', '.uploads']),
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
    /*
     * O mascote é um componente entregue pronto e mantido como arquivo de
     * terceiro: fica idêntico ao que veio da equipe de design, para que uma
     * versão nova possa simplesmente substituí-lo. Ele exporta hooks e
     * constantes junto do componente (Fast Refresh) e usa dois padrões que as
     * regras do React Compiler desaconselham — o compilador apenas deixa de
     * otimizar esse componente, sem mudar o comportamento. A viagem à Lua
     * (`ViagemLua`) roda uma vez, com a posição capturada quando começa: o
     * efeito dela não declara dependências de propósito.
     */
    files: ['src/components/mascote/Mascote.jsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    // Scripts de build e a API rodam no Node, não no navegador.
    files: ['scripts/**/*.{js,jsx,mjs}', 'server/**/*.js', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'react-refresh/only-export-components': 'off',
      'no-console': 'off',
    },
  },
])

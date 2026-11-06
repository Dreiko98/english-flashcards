import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // This project doesn't use the React Compiler, but eslint-plugin-react-hooks v7's
      // "recommended" config bundles the Compiler's static analysis rules regardless. This one
      // flags the standard fetch-on-mount custom-hook pattern (effect calling an async function
      // that eventually setStates) as unsafe, which it isn't for a plain React 18 app — it's
      // meant to push toward `useEffectEvent` (React 19+, not available here). Older plugin
      // versions without this rule only support ESLint up to v9, and we're on v10, so disabling
      // it here is simpler than downgrading both packages.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  prettierConfig,
)

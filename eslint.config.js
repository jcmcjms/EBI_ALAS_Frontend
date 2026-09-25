import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      import: importPlugin,
    },
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    settings: {
      'import/resolver': {
        node: true,
      },
    },
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/shared/**',
              from: './src/features/**',
              message: 'Shared code cannot import from features',
            },
            {
              target: './src/features/auth/**',
              from: './src/features/loans/**',
              message: 'Loans feature cannot import from Auth feature',
            },
            {
              target: './src/features/loans/**',
              from: './src/features/auth/**',
              message: 'Auth feature cannot import from Loans feature',
            },
            {
              target: './src/features/admin/**',
              from: './src/features/loans/**',
              message: 'Loans feature cannot import from Admin feature',
            },
            {
              target: './src/features/loans/**',
              from: './src/features/admin/**',
              message: 'Admin feature cannot import from Loans feature',
            },
            {
              target: './src/features/account/**',
              from: './src/features/loans/**',
              message: 'Loans feature cannot import from Account feature',
            },
            {
              target: './src/features/loans/**',
              from: './src/features/account/**',
              message: 'Account feature cannot import from Loans feature',
            },
            {
              target: './src/features/notifications/**',
              from: './src/features/loans/**',
              message: 'Loans feature cannot import from Notifications feature',
            },
            {
              target: './src/features/loans/**',
              from: './src/features/notifications/**',
              message: 'Notifications feature cannot import from Loans feature',
            },
            {
              target: './src/features/dashboard/**',
              from: './src/features/loans/**',
              message: 'Loans feature cannot import from Dashboard feature',
            },
            {
              target: './src/features/loans/**',
              from: './src/features/dashboard/**',
              message: 'Dashboard feature cannot import from Loans feature',
            },
          ],
        },
      ],
    },
  },
])
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
              target: './src/shared/**',
              from: './src/app/**',
              message: 'Shared code cannot import from app',
            },
            {
              target: './src/features/**',
              from: './src/app/**',
              message: 'Features cannot import from app',
            },
            // Blanket feature-to-feature restriction
            ...[
              'account',
              'admin',
              'audit-logs',
              'auth',
              'dashboard',
              'loans',
              'notifications',
            ].flatMap((feature) =>
              [
                'account',
                'admin',
                'audit-logs',
                'auth',
                'dashboard',
                'loans',
                'notifications',
              ]
                .filter((other) => other !== feature)
                .map((other) => ({
                  target: `./src/features/${feature}/**`,
                  from: `./src/features/${other}/**`,
                  message: `Feature '${feature}' cannot import from feature '${other}'`,
                })),
            ),
          ],
        },
      ],
    },
  },
])
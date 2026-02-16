import nextPlugin from '@next/eslint-plugin-next'
import tseslint from 'typescript-eslint'

const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
  nextPlugin.configs['core-web-vitals'],
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
]

export default eslintConfig

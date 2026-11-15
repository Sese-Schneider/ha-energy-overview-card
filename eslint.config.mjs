import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { window: 'readonly', document: 'readonly', customElements: 'readonly', console: 'readonly', Event: 'readonly', CustomEvent: 'readonly', HTMLElement: 'readonly', HTMLButtonElement: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', process: 'readonly', URL: 'readonly' } },
    rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
);

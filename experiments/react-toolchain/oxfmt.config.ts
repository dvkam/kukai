import { defineConfig } from 'oxfmt';

export default defineConfig({
  singleQuote: true,
  trailingComma: 'none',
  printWidth: 100,
  ignorePatterns: ['dist-profile/', 'pnpm-lock.yaml', 'src/**/*.d.css.ts']
});

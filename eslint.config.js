// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // React Three Fiber JSX (<mesh position args …>) is not DOM, so this rule misfires.
    files: ['src/features/mascot/components/**/*.tsx'],
    rules: { 'react/no-unknown-property': 'off' },
  },
  // Must stay last: disables ESLint rules that conflict with Prettier.
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*', 'web-build/*', 'ios/*', 'android/*'],
  },
]);

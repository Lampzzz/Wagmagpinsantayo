// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  expoConfig,
  // Must stay last: disables ESLint rules that conflict with Prettier.
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*', 'web-build/*', 'ios/*', 'android/*'],
  },
]);

const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "artifacts/**",
      "comparison-deck/**",
      "dist/**",
      "server_dist/**",
      ".expo/**",
    ],
    rules: {
      "react/no-unescaped-entities": "off",
    },
  }
]);

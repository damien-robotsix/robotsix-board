import js from "@eslint/js";
import globals from "globals";
import jsdoc from "eslint-plugin-jsdoc";
import vitest from "@vitest/eslint-plugin";

export default [
  js.configs.recommended,
  jsdoc.configs["flat/recommended"],
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: { ...globals.browser },
    },
    rules: {
      "no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrors: "all",
        caughtErrorsIgnorePattern: "^_",
      }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "warn",
      "eqeqeq": ["error", "always"],
      "prefer-const": "error",
      "curly": "error",
      "no-alert": "warn",
    },
  },
  {
    files: ["tests/**/*.test.js", "tests/**/board_shared.js", "tests/**/setup.js", "vitest.config.mjs"],
    plugins: { vitest },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      ...vitest.configs.recommended.rules,
    },
  },
  {
    files: ["src/robotsix_board/static/vanilla.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
    },
  },
  {
    files: ["eslint.config.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
  {
    files: ["playwright.config.mjs", "tests/robotsix_board/e2e/**/*.spec.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
];

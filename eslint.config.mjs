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
    files: ["tests/**/*.test.js", "vitest.config.mjs"],
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
];

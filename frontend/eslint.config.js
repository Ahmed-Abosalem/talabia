import js from "@eslint/js";
import react from "eslint-plugin-react";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    plugins: { react },
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        process: "readonly",
        Blob: "readonly",
        URL: "readonly",
        FormData: "readonly",
        File: "readonly",
        fetch: "readonly",
        alert: "readonly",
        confirm: "readonly",
        prompt: "readonly",
        navigator: "readonly",
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
    },
  },
];

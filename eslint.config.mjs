import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
    rules: {
      // Строгие правила TypeScript для выявления ошибок типизации
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/strict-boolean-expressions": "off", // слишком строго для проекта
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
      
      // Правила для функций и параметров - требуют type checking
      "@typescript-eslint/explicit-function-return-type": "off", // Next.js API routes часто не нуждаются в явном возвращаемом типе
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-floating-promises": "error", // поменял на error
      
      // Type-aware правила для качества кода
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      
      // Проверка корректности использования async/await
      "require-await": "off",
      "@typescript-eslint/require-await": "warn",
      
      // Консистентность кода
      "@typescript-eslint/consistent-type-imports": "warn",
      "@typescript-eslint/consistent-type-definitions": ["warn", "interface"],
      
      // Правила для проверки типов параметров функций (важно для Next.js API)
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-confusing-void-expression": "warn",
      "@typescript-eslint/prefer-readonly": "warn",
    },
  },
  {
    files: ["src/app/api/**/*.ts"],
    rules: {
      // Специальные правила для Next.js API routes
      "@typescript-eslint/explicit-function-return-type": "off",
      // Убеждаемся что параметры API routes типизированы правильно
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-floating-promises": "error",
      // Строже проверяем async/await в API routes
      "@typescript-eslint/require-await": "error",
      // Проверяем что функции правильно типизированы
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
    },
  },
];

export default eslintConfig;

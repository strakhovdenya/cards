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
      
      // Правила для предотвращения ошибок типизации
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-confusing-void-expression": "warn",
      
      // Стандартные ESLint правила
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  // Специальные правила для Next.js API routes
  {
    files: ["src/app/api/**/*.ts"],
    rules: {
      // Усиленные правила для API routes для предотвращения build ошибок
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/prefer-promise-reject-errors": "error",
      
      // Правила для корректной типизации параметров в API routes
      "@typescript-eslint/no-unsafe-assignment": "error", // строже для API
      "@typescript-eslint/no-unsafe-member-access": "error", // строже для API
      "@typescript-eslint/no-unsafe-argument": "error", // строже для API
      
      // Обязательная обработка ошибок в API routes
      "prefer-promise-reject-errors": "error",
    },
  },
];

export default eslintConfig;

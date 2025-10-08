import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Allow 'any' type in development/legacy code - convert to warnings
      "@typescript-eslint/no-explicit-any": "warn",
      
      // Allow unescaped entities in JSX - convert to warnings  
      "react/no-unescaped-entities": "warn",
      
      // Allow unused variables in development - convert to warnings
      "@typescript-eslint/no-unused-vars": "warn",
      
      // Allow prefer-const issues - convert to warnings
      "prefer-const": "warn",
      
      // Allow empty object types - convert to warnings
      "@typescript-eslint/no-empty-object-type": "warn",
      
      // Allow HTML links in development - convert to warnings
      "@next/next/no-html-link-for-pages": "warn",
      
      // Allow missing dependencies in useEffect - convert to warnings
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import cabLayout from "./eslint-rules/index.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "window", property: "alert", message: "Usa useGestionaleToast()." },
        { object: "window", property: "confirm", message: "Usa useGestionaleConfirm()." },
        { object: "window", property: "prompt", message: "Usa useGestionaleToast()/UI dedicata." },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/context/toast-context",
              importNames: ["useToast"],
              message: "Usa useGestionaleToast() (enforcement UX).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/domain/**/*-entry.ts", "src/services/**/*.service.ts"],
    plugins: { "cab-rbac": cabLayout, "cab-perf": cabLayout },
    rules: {
      "cab-rbac/no-auth-in-services": "error",
      "cab-rbac/no-entrypoint-chaining": "error",
      "cab-perf/no-select-star": "error",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "cab-rbac": cabLayout },
    rules: {
      "cab-rbac/no-ensure-workflow-write": "error",
    },
  },
  {
    files: ["components/gestionale/report/**/*.tsx"],
    plugins: { "cab-perf": cabLayout },
    rules: {
      "cab-perf/no-ssr-false-prefetched-route": "error",
    },
  },
  {
    files: ["components/gestionale/**/*.{ts,tsx}"],
    plugins: { "cab-perf": cabLayout },
    rules: {
      "cab-perf/no-img-without-next-image": "warn",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "cab-perf": cabLayout },
    rules: {
      "cab-perf/no-heavy-import-in-client": "error",
    },
  },
  {
    plugins: { "cab-layout": cabLayout },
    rules: {
      "cab-layout/no-flex-overflow-risk": "error",
      "cab-layout/no-ui-contract-violation": "error",
      "cab-layout/no-native-title-tooltip": "warn",
      "cab-layout/no-direct-ds-import": "warn",
      "cab-layout/no-css-tooltip": "warn",
    },
  },
  {
    files: [
      "src/hooks/use-gestionale-toast.ts",
      "context/toast-context.tsx",
      "context/upload-feedback-context.tsx",
      "src/components/gestionale-realtime-bridge.tsx",
      "src/components/gestionale-notifications-bridge.tsx",
      "src/providers/query-provider.tsx",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["e2e/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/sw.js",
  ]),
]);

export default eslintConfig;

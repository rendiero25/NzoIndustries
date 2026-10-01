import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // D-10: notifikasi pakai Sonner, konfirmasi destruktif pakai AlertDialog.
      "no-alert": "error",
      "no-restricted-globals": [
        "error",
        { name: "alert", message: "Pakai toast Sonner (D-10)." },
        { name: "confirm", message: "Pakai AlertDialog shadcn (D-10)." },
        { name: "prompt", message: "Pakai Dialog + form shadcn." },
      ],
    },
  },
  {
    // TODO(Fase 12): kembalikan ke "error". Pelanggaran warisan starter GeekyTech (18 titik,
    // lihat Catatan Fase 0 di task.md). Dibereskan saat komponen terkait dirombak.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/error-boundaries": "warn",
    },
  },
  {
    // D-19: kode NZO baru tidak boleh memakai client/tipe Supabase GeekyTech.
    files: [
      "src/server/**",
      "src/lib/auth/**",
      "src/lib/supabase/*.ts",
      "src/proxy.ts",
      "src/app/admin/mfa/**",
      "src/components/admin/mfa-form.tsx",
      "tests/**",
      "scripts/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/supabase/legacy/*", "@/types/legacy-supabase"],
              message: "Pakai @/lib/supabase/{server,client,admin} dan @/types/database (D-19).",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "supabase/_reference/**"]),
]);

export default eslintConfig;

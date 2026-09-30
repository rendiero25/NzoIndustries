# Referensi migration GeekyTech

Folder `geekytech-migrations/` berisi 37 migration dari starter GeekyTech (D-01, D-15).

**Acuan saja. Jangan dijalankan** ke project Supabase NZO.

Schema NZO ditulis ulang di `supabase/migrations/` pada Fase 1 (lihat `task.md`), karena berbeda jauh: fitment kendaraan, ledger stok, staging import Jubelio, RBAC 5 role, audit log. Pola yang layak dipakai ulang dari sini: trigger `updated_at`, `handle_new_user`, RLS per tabel, expiry pesanan via `pg_cron`, rollup rating produk.

-- ============================================================
-- Fix: guard_product_cache_columns() gagal untuk UPDATE product_variants
-- ("record new has no field average_rating"). PL/pgSQL tidak menjamin
-- short-circuit `tg_table_name = 'products' and (new.average_rating ...)`,
-- jadi kolom khusus products kini hanya dibaca di dalam IF bersarang.
-- Ditemukan saat import ulang varian (Fase 3).
-- ============================================================

create or replace function public.guard_product_cache_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  internal boolean := coalesce(current_setting('nzo.cache_write', true), '') = 'on';
begin
  if internal then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.stock = 0;
    if tg_table_name = 'products' then
      new.average_rating = 0;
      new.review_count = 0;
      new.total_sold = 0;
    end if;
    return new;
  end if;

  if new.stock is distinct from old.stock then
    raise exception 'stock hanya berubah lewat inventory_movements' using errcode = '42501';
  end if;

  if tg_table_name = 'products' then
    if new.average_rating is distinct from old.average_rating
       or new.review_count is distinct from old.review_count
       or new.total_sold is distinct from old.total_sold then
      raise exception 'kolom cache produk tidak bisa diubah langsung' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_product_cache_columns() from public, anon, authenticated;

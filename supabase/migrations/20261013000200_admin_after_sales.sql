-- Fase 8D: pelanggan & after-sales di admin.
-- 1) admin_customers: daftar pelanggan + agregat belanja + email (auth.users), segmentasi.
-- 2) admin_set_after_sales_status: status retur/klaim dengan matriks transisi + notifikasi.
-- 3) admin_reply_review: moderasi & balasan ulasan + notifikasi.

create or replace function public.admin_customers(
  p_q text default null,
  p_segment text default null,
  p_user uuid default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  full_name text,
  email text,
  phone text,
  is_blocked boolean,
  created_at timestamptz,
  deleted_at timestamptz,
  order_count bigint,
  total_spent bigint,
  last_order_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
begin
  if not private.has_role(array['owner', 'admin', 'cs']::public.app_role[]) then
    raise exception 'Tidak diizinkan' using errcode = '42501';
  end if;
  if p_segment is not null and p_segment not in ('new', 'active', 'inactive', 'top', 'blocked') then
    raise exception 'Segmen tidak dikenal';
  end if;

  return query
  with stats as (
    select o.user_id,
           count(*) as order_count,
           coalesce(sum(o.grand_total), 0)::bigint as total_spent,
           max(o.created_at) as last_order_at
      from public.orders o
     where o.status in ('paid', 'processing', 'shipped', 'delivered', 'completed')
     group by o.user_id
  ),
  base as (
    select p.id, p.full_name, u.email::text as email, p.phone, p.is_blocked, p.created_at, p.deleted_at,
           coalesce(s.order_count, 0) as order_count,
           coalesce(s.total_spent, 0)::bigint as total_spent,
           s.last_order_at
      from public.profiles p
      join auth.users u on u.id = p.id
      left join stats s on s.user_id = p.id
     where p.role = 'customer'
       and (p_user is null or p.id = p_user)
       and (
         v_q is null
         or p.full_name ilike '%' || v_q || '%'
         or u.email ilike '%' || v_q || '%'
         or p.phone ilike '%' || v_q || '%'
       )
       and (
         p_segment is null
         or (p_segment = 'new' and p.created_at >= now() - interval '30 days')
         or (p_segment = 'active' and s.last_order_at >= now() - interval '90 days')
         or (p_segment = 'inactive' and s.last_order_at < now() - interval '90 days')
         or (p_segment = 'top' and s.total_spent > 0)
         or (p_segment = 'blocked' and p.is_blocked)
       )
  )
  select b.*, count(*) over () as total_count
    from base b
   order by
     case when p_segment = 'top' then b.total_spent end desc nulls last,
     b.created_at desc
   limit least(greatest(p_limit, 1), 100)
   offset greatest(p_offset, 0);
end;
$$;

-- Status retur (`returns`) / klaim garansi (`warranty_claims`).
create or replace function public.admin_set_after_sales_status(
  p_kind text,
  p_id uuid,
  p_status text,
  p_note text default null,
  p_resolution text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_from text;
  v_allowed text[];
  v_title text;
  v_label text;
begin
  if not private.has_role(array['owner', 'admin', 'cs']::public.app_role[]) then
    raise exception 'Tidak diizinkan' using errcode = '42501';
  end if;
  if p_note is not null and char_length(p_note) > 1000 then
    raise exception 'Catatan terlalu panjang';
  end if;
  if p_resolution is not null and char_length(p_resolution) > 1000 then
    raise exception 'Resolusi terlalu panjang';
  end if;

  if p_kind = 'return' then
    select r.user_id, r.status::text into v_user, v_from from public.returns r where r.id = p_id for update;
    if not found then raise exception 'Retur tidak ditemukan'; end if;
    v_allowed := case v_from
      when 'requested' then array['approved', 'rejected']
      when 'approved' then array['item_shipped', 'item_received', 'refunded', 'rejected']
      when 'item_shipped' then array['item_received']
      when 'item_received' then array['refunded', 'completed']
      when 'refunded' then array['completed']
      else array[]::text[]
    end;
    if not p_status = any (v_allowed) then
      raise exception 'Status retur tidak bisa diubah dari % ke %', v_from, p_status;
    end if;
    if p_status in ('rejected', 'refunded', 'completed') and nullif(btrim(coalesce(p_resolution, '')), '') is null then
      raise exception 'Tulis resolusi untuk pelanggan';
    end if;
    update public.returns
       set status = p_status::public.return_status,
           admin_note = coalesce(nullif(btrim(p_note), ''), admin_note),
           resolution = coalesce(nullif(btrim(p_resolution), ''), resolution)
     where id = p_id;
    v_title := 'Status retur diperbarui';
    v_label := case p_status
      when 'approved' then 'Retur disetujui. Kirim barang sesuai instruksi.'
      when 'rejected' then 'Retur ditolak.'
      when 'item_shipped' then 'Barang retur tercatat dikirim.'
      when 'item_received' then 'Barang retur sudah kami terima.'
      when 'refunded' then 'Dana retur sudah dikembalikan.'
      when 'completed' then 'Retur selesai.'
    end;
  elsif p_kind = 'claim' then
    select c.user_id, c.status::text into v_user, v_from from public.warranty_claims c where c.id = p_id for update;
    if not found then raise exception 'Klaim tidak ditemukan'; end if;
    v_allowed := case v_from
      when 'submitted' then array['in_review', 'approved', 'rejected']
      when 'in_review' then array['approved', 'rejected']
      when 'approved' then array['resolved']
      else array[]::text[]
    end;
    if not p_status = any (v_allowed) then
      raise exception 'Status klaim tidak bisa diubah dari % ke %', v_from, p_status;
    end if;
    if p_status in ('rejected', 'resolved') and nullif(btrim(coalesce(p_resolution, '')), '') is null then
      raise exception 'Tulis resolusi untuk pelanggan';
    end if;
    update public.warranty_claims
       set status = p_status::public.claim_status,
           admin_note = coalesce(nullif(btrim(p_note), ''), admin_note),
           resolution = coalesce(nullif(btrim(p_resolution), ''), resolution)
     where id = p_id;
    v_title := 'Status klaim garansi diperbarui';
    v_label := case p_status
      when 'in_review' then 'Klaim sedang ditinjau.'
      when 'approved' then 'Klaim disetujui.'
      when 'rejected' then 'Klaim ditolak.'
      when 'resolved' then 'Klaim selesai.'
    end;
  else
    raise exception 'Jenis tidak dikenal';
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (v_user, 'after_sales', v_title, v_label, '/account/returns');
end;
$$;

-- Moderasi ulasan: status + balasan (opsional). Pelanggan diberi tahu bila dibalas.
create or replace function public.admin_moderate_review(
  p_id uuid,
  p_status public.review_status,
  p_reply text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_old_reply text;
  v_reply text := nullif(btrim(coalesce(p_reply, '')), '');
  v_slug text;
begin
  if not private.has_role(array['owner', 'admin', 'cs']::public.app_role[]) then
    raise exception 'Tidak diizinkan' using errcode = '42501';
  end if;
  if v_reply is not null and char_length(v_reply) > 1000 then
    raise exception 'Balasan maksimal 1000 karakter';
  end if;

  select r.user_id, r.reply, p.slug into v_user, v_old_reply, v_slug
    from public.reviews r
    join public.products p on p.id = r.product_id
   where r.id = p_id
   for update of r;
  if not found then raise exception 'Ulasan tidak ditemukan'; end if;

  update public.reviews
     set status = p_status,
         reply = v_reply,
         replied_by = case when v_reply is null then null when v_reply is distinct from v_old_reply then (select auth.uid()) else replied_by end,
         replied_at = case when v_reply is null then null when v_reply is distinct from v_old_reply then now() else replied_at end
   where id = p_id;

  if v_reply is not null and v_reply is distinct from v_old_reply and p_status = 'published' then
    insert into public.notifications (user_id, type, title, body, link)
    values (v_user, 'review_reply', 'Ulasanmu dibalas', left(v_reply, 140), '/products/' || v_slug);
  end if;
end;
$$;

revoke all on function public.admin_customers(text, text, uuid, integer, integer) from public, anon;
revoke all on function public.admin_set_after_sales_status(text, uuid, text, text, text) from public, anon;
revoke all on function public.admin_moderate_review(uuid, public.review_status, text) from public, anon;
grant execute on function public.admin_customers(text, text, uuid, integer, integer) to authenticated;
grant execute on function public.admin_set_after_sales_status(text, uuid, text, text, text) to authenticated;
grant execute on function public.admin_moderate_review(uuid, public.review_status, text) to authenticated;

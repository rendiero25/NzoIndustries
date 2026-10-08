// Test RLS terhadap project Supabase dev (butuh migration + seed sudah diterapkan).
// Jalankan: pnpm test:rls
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { admin, anon, cleanupUsers, createTestUser, RUN_ID, type TestUser } from "./helpers.mts";

let customerA: TestUser;
let customerB: TestUser;
let owner: TestUser;
let adminUser: TestUser;
let warehouse: TestUser;
let cs: TestUser;
let staffNoMfa: TestUser;
let orderA: string;
let publishedProductId: string;
let simpleProductId: string;

before(async () => {
  customerA = await createTestUser("customer");
  customerB = await createTestUser("customer");
  owner = await createTestUser("owner", { mfa: true });
  adminUser = await createTestUser("admin", { mfa: true });
  warehouse = await createTestUser("warehouse", { mfa: true });
  cs = await createTestUser("cs", { mfa: true });
  staffNoMfa = await createTestUser("admin");

  const { data: product, error: productError } = await admin
    .from("products")
    .select("id")
    .eq("sku", "DEMO-OLI-001")
    .single();
  if (productError || !product) throw new Error("Seed belum diterapkan (DEMO-OLI-001 tidak ada)");
  publishedProductId = product.id;
  simpleProductId = product.id;

  const { data: order, error } = await admin
    .from("orders")
    .insert({
      order_number: "",
      user_id: customerA.id,
      subtotal: 100000,
      shipping_cost: 10000,
      discount_total: 0,
      unique_code: 0,
      grand_total: 110000,
      shipping_address: { city: "Test" },
    })
    .select("id")
    .single();
  if (error || !order) throw new Error(`gagal membuat order test: ${error?.message}`);
  orderA = order.id;
});

after(async () => {
  await cleanupUsers();
});

describe("katalog publik", () => {
  test("anon hanya melihat produk published", async () => {
    const { data, error } = await anon().from("products").select("sku, status");
    assert.ifError(error);
    assert.ok(data && data.length > 0);
    assert.ok(data.every((p) => p.status === "published"));
    assert.ok(!data.some((p) => p.sku === "DEMO-AKS-002"), "draft tidak boleh terlihat");
  });

  test("anon tidak bisa melihat voucher", async () => {
    const { data } = await anon().from("vouchers").select("id");
    assert.equal(data?.length ?? 0, 0);
  });

  test("customer tidak bisa menulis produk", async () => {
    const { data } = await customerA.client
      .from("products")
      .update({ name: "hack" })
      .eq("id", publishedProductId)
      .select("id");
    assert.equal(data?.length ?? 0, 0);
  });
});

describe("isolasi pelanggan", () => {
  test("alamat hanya terlihat oleh pemiliknya", async () => {
    const { data: addr, error } = await customerA.client
      .from("addresses")
      .insert({
        user_id: customerA.id,
        recipient: "Uji",
        phone: "081234567890",
        province: "DKI Jakarta",
        city: "Jakarta Selatan",
        district: "Kebayoran Baru",
        postal_code: "12110",
        full_address: "Jl. Uji No. 1",
      })
      .select("id")
      .single();
    assert.ifError(error);

    const { data: seenByB } = await customerB.client
      .from("addresses")
      .select("id")
      .eq("id", addr!.id);
    assert.equal(seenByB?.length ?? 0, 0);

    const { data: updatedByB } = await customerB.client
      .from("addresses")
      .update({ recipient: "hack" })
      .eq("id", addr!.id)
      .select("id");
    assert.equal(updatedByB?.length ?? 0, 0);

    const { error: insertForOther } = await customerB.client.from("addresses").insert({
      user_id: customerA.id,
      recipient: "x",
      phone: "081234567890",
      province: "x",
      city: "x",
      district: "x",
      postal_code: "12110",
      full_address: "x",
    });
    assert.ok(insertForOther, "tidak boleh membuat alamat untuk user lain");
  });

  test("pesanan hanya terlihat pemiliknya dan tidak bisa dibuat/diubah customer", async () => {
    const { data: own } = await customerA.client.from("orders").select("id").eq("id", orderA);
    assert.equal(own?.length, 1);

    const { data: other } = await customerB.client.from("orders").select("id").eq("id", orderA);
    assert.equal(other?.length ?? 0, 0);

    const { error: insertError } = await customerA.client.from("orders").insert({
      order_number: "",
      user_id: customerA.id,
      subtotal: 1,
      grand_total: 1,
      shipping_address: {},
    });
    assert.ok(insertError, "customer tidak boleh membuat order langsung");

    const { data: updated } = await customerA.client
      .from("orders")
      .update({ status: "paid" })
      .eq("id", orderA)
      .select("id");
    assert.equal(updated?.length ?? 0, 0);
  });

  test("bukti transfer: upload milik sendiri saja", async () => {
    const path = `${customerA.id}/proof-${RUN_ID}.png`;
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      "base64",
    );
    const up = await customerA.client.storage
      .from("payment-proofs")
      .upload(path, png, { contentType: "image/png" });
    assert.ifError(up.error);

    const { error: proofError } = await customerA.client.from("payment_proofs").insert({
      order_id: orderA,
      user_id: customerA.id,
      storage_path: path,
      mime_type: "image/png",
      size_bytes: png.length,
    });
    assert.ifError(proofError);

    const upOther = await customerB.client.storage
      .from("payment-proofs")
      .upload(`${customerA.id}/evil-${RUN_ID}.png`, png, { contentType: "image/png" });
    assert.ok(upOther.error, "tidak boleh upload ke folder user lain");

    const dl = await customerB.client.storage.from("payment-proofs").download(path);
    assert.ok(dl.error, "tidak boleh mengunduh bukti user lain");

    const { error: proofForOther } = await customerB.client.from("payment_proofs").insert({
      order_id: orderA,
      user_id: customerB.id,
      storage_path: `${customerB.id}/x.png`,
      mime_type: "image/png",
      size_bytes: 10,
    });
    assert.ok(proofForOther, "tidak boleh mengirim bukti untuk order orang lain");
  });

  test("customer tidak bisa menaikkan role sendiri", async () => {
    const { error } = await customerA.client
      .from("profiles")
      .update({ role: "owner" })
      .eq("id", customerA.id);
    assert.ok(error, "update kolom role harus ditolak");

    const { error: rpcError } = await customerA.client.rpc("set_user_role", {
      target_user: customerA.id,
      new_role: "owner",
    });
    assert.ok(rpcError, "RPC set_user_role harus ditolak untuk customer");

    const { data: ok } = await customerA.client
      .from("profiles")
      .update({ full_name: "Nama Baru" })
      .eq("id", customerA.id)
      .select("full_name");
    assert.equal(ok?.[0]?.full_name, "Nama Baru");
  });
});

describe("staf & MFA", () => {
  test("D-20: staf aal1 ditolak saat require_staff_mfa=true, diizinkan saat false", async () => {
    const { data: setting } = await admin
      .from("store_settings")
      .select("require_staff_mfa")
      .single();
    const original = setting?.require_staff_mfa ?? false;

    try {
      await admin.from("store_settings").update({ require_staff_mfa: true }).eq("id", true);
      const { data: draftsStrict } = await staffNoMfa.client
        .from("products")
        .select("sku")
        .eq("sku", "DEMO-AKS-002");
      assert.equal(draftsStrict?.length ?? 0, 0, "aal1 tidak boleh akses saat MFA wajib");
      const { data: ordersStrict } = await staffNoMfa.client
        .from("orders")
        .select("id")
        .eq("id", orderA);
      assert.equal(ordersStrict?.length ?? 0, 0);

      await admin.from("store_settings").update({ require_staff_mfa: false }).eq("id", true);
      const { data: draftsRelaxed } = await staffNoMfa.client
        .from("products")
        .select("sku")
        .eq("sku", "DEMO-AKS-002");
      assert.equal(draftsRelaxed?.length, 1, "aal1 boleh akses saat MFA tidak wajib");

      // Customer tetap tidak mendapat akses staf apa pun.
      const { data: customerDrafts } = await customerA.client
        .from("products")
        .select("sku")
        .eq("sku", "DEMO-AKS-002");
      assert.equal(customerDrafts?.length ?? 0, 0);
    } finally {
      await admin.from("store_settings").update({ require_staff_mfa: original }).eq("id", true);
    }
  });

  test("hanya owner yang bisa mengubah require_staff_mfa", async () => {
    const { data: byAdmin } = await adminUser.client
      .from("store_settings")
      .update({ require_staff_mfa: true })
      .eq("id", true)
      .select("id");
    assert.equal(byAdmin?.length ?? 0, 0);
  });

  test("admin aal2 melihat draft, mengubah produk, dan tercatat di audit log", async () => {
    const { data: drafts } = await adminUser.client
      .from("products")
      .select("sku")
      .eq("sku", "DEMO-AKS-002");
    assert.equal(drafts?.length, 1);

    const { data: before } = await admin
      .from("products")
      .select("meta_title")
      .eq("id", publishedProductId)
      .single();
    const newTitle = `RLS ${RUN_ID}`;
    const { data: updated, error } = await adminUser.client
      .from("products")
      .update({ meta_title: newTitle })
      .eq("id", publishedProductId)
      .select("id");
    assert.ifError(error);
    assert.equal(updated?.length, 1);

    const { data: logs } = await adminUser.client
      .from("audit_logs")
      .select("actor_id, action, entity_type")
      .eq("entity_type", "products")
      .eq("entity_id", publishedProductId)
      .eq("actor_id", adminUser.id);
    assert.ok(logs && logs.length >= 1, "audit log harus tercatat");

    // kembalikan nilai seed
    await adminUser.client
      .from("products")
      .update({ meta_title: before?.meta_title ?? null })
      .eq("id", publishedProductId);

    const { error: stockError } = await adminUser.client
      .from("products")
      .update({ stock: 99999 })
      .eq("id", publishedProductId);
    assert.ok(stockError, "stok tidak boleh diubah langsung");
  });

  test("audit log tidak bisa dibaca warehouse/cs dan tidak bisa diubah", async () => {
    const { data: w } = await warehouse.client.from("audit_logs").select("id").limit(1);
    assert.equal(w?.length ?? 0, 0);
    const { data: c } = await cs.client.from("audit_logs").select("id").limit(1);
    assert.equal(c?.length ?? 0, 0);
    const { error } = await owner.client.from("audit_logs").delete().gt("id", 0);
    assert.ok(error, "audit log tidak boleh dihapus");
  });

  test("ledger stok: warehouse boleh menulis, append-only, cs ditolak", async () => {
    const { data: before } = await admin
      .from("products")
      .select("stock")
      .eq("id", simpleProductId)
      .single();

    const plus = await warehouse.client
      .from("inventory_movements")
      .insert({
        product_id: simpleProductId,
        quantity: 1,
        type: "adjustment",
        reason: `Uji RLS otomatis ${RUN_ID}`,
        created_by: warehouse.id,
      })
      .select("id")
      .single();
    assert.ifError(plus.error);

    const { data: mid } = await admin
      .from("products")
      .select("stock")
      .eq("id", simpleProductId)
      .single();
    assert.equal(mid!.stock, before!.stock + 1);

    const minus = await warehouse.client.from("inventory_movements").insert({
      product_id: simpleProductId,
      quantity: -1,
      type: "adjustment",
      reason: `Uji RLS otomatis ${RUN_ID} (balik)`,
      created_by: warehouse.id,
    });
    assert.ifError(minus.error);

    const { data: afterRow } = await admin
      .from("products")
      .select("stock")
      .eq("id", simpleProductId)
      .single();
    assert.equal(afterRow!.stock, before!.stock);

    // Tanpa policy UPDATE, RLS menyaring baris: 0 baris berubah.
    const { data: updatedRows } = await warehouse.client
      .from("inventory_movements")
      .update({ quantity: 100 })
      .eq("id", plus.data!.id)
      .select("id");
    assert.equal(updatedRows?.length ?? 0, 0, "movement tidak boleh diubah staf");

    // Trigger append-only menolak bahkan service role.
    const { error: serviceUpdateError } = await admin
      .from("inventory_movements")
      .update({ quantity: 100 })
      .eq("id", plus.data!.id);
    assert.ok(serviceUpdateError, "trigger append-only harus menolak update");

    const { data: unchanged } = await admin
      .from("inventory_movements")
      .select("quantity")
      .eq("id", plus.data!.id)
      .single();
    assert.equal(unchanged?.quantity, 1);

    const { error: csError } = await cs.client.from("inventory_movements").insert({
      product_id: simpleProductId,
      quantity: 1,
      type: "adjustment",
      reason: "tidak boleh",
      created_by: cs.id,
    });
    assert.ok(csError, "cs tidak boleh menulis stok");
  });

  test("pesanan: cs baca saja, warehouse boleh ubah status", async () => {
    const { data: seen } = await cs.client.from("orders").select("id").eq("id", orderA);
    assert.equal(seen?.length, 1);

    const { data: csUpdate } = await cs.client
      .from("orders")
      .update({ status: "processing" })
      .eq("id", orderA)
      .select("id");
    assert.equal(csUpdate?.length ?? 0, 0);

    const { data: whUpdate, error } = await warehouse.client
      .from("orders")
      .update({ status: "processing" })
      .eq("id", orderA)
      .select("id");
    assert.ifError(error);
    assert.equal(whUpdate?.length, 1);

    const { data: history } = await customerA.client
      .from("order_status_history")
      .select("to_status")
      .eq("order_id", orderA);
    assert.ok(
      history?.some((h) => h.to_status === "processing"),
      "riwayat status tercatat",
    );
  });

  test("store_settings: admin baca, hanya owner ubah", async () => {
    const { data: read } = await adminUser.client.from("store_settings").select("store_name");
    assert.equal(read?.length, 1);

    const { data: adminUpdate } = await adminUser.client
      .from("store_settings")
      .update({ low_stock_threshold: 7 })
      .eq("id", true)
      .select("id");
    assert.equal(adminUpdate?.length ?? 0, 0);

    const { data: current } = await admin
      .from("store_settings")
      .select("low_stock_threshold")
      .single();
    const { data: ownerUpdate, error } = await owner.client
      .from("store_settings")
      .update({ low_stock_threshold: current!.low_stock_threshold })
      .eq("id", true)
      .select("id");
    assert.ifError(error);
    assert.equal(ownerUpdate?.length, 1);
  });

  test("webhook_events tertutup untuk user mana pun", async () => {
    const { data, error } = await owner.client.from("webhook_events").select("id").limit(1);
    assert.ok(error || (data?.length ?? 0) === 0);
  });

  test("set_user_role: owner bisa, admin tidak", async () => {
    const { error: adminError } = await adminUser.client.rpc("set_user_role", {
      target_user: customerB.id,
      new_role: "cs",
    });
    assert.ok(adminError, "admin tidak boleh mengubah role");

    const { error } = await owner.client.rpc("set_user_role", {
      target_user: customerB.id,
      new_role: "cs",
    });
    assert.ifError(error);
    const { data } = await admin.from("profiles").select("role").eq("id", customerB.id).single();
    assert.equal(data?.role, "cs");

    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "owner");
    if (count === 1) {
      const { error: lastOwner } = await owner.client.rpc("set_user_role", {
        target_user: owner.id,
        new_role: "admin",
      });
      assert.ok(lastOwner, "owner terakhir tidak boleh diturunkan");
    }
  });
});

describe("import katalog (Fase 3)", () => {
  test("staging import hanya untuk owner/admin", async () => {
    const { data: batch, error } = await adminUser.client
      .from("import_batches")
      .insert({ source: "csv", file_name: `rls-${RUN_ID}.csv`, status: "pending" })
      .select("id")
      .single();
    assert.ifError(error);

    const batchId: string = batch!.id;
    for (const user of [cs, warehouse, customerA]) {
      const { data: seen } = await user.client
        .from("import_batches")
        .select("id")
        .eq("id", batchId);
      assert.equal(seen?.length ?? 0, 0, `${user.role} tidak boleh melihat batch`);
      const { error: insertError } = await user.client
        .from("import_products")
        .insert({ batch_id: batch!.id, raw: {}, status: "pending" });
      assert.ok(insertError, `${user.role} tidak boleh menulis staging`);
    }
    await admin.from("import_batches").delete().eq("id", batch!.id);
  });

  test("RPC import_commit_batch ditolak untuk selain owner/admin", async () => {
    const { data: batch } = await admin
      .from("import_batches")
      .insert({ source: "csv", file_name: `rls-${RUN_ID}.csv`, status: "pending" })
      .select("id")
      .single();
    for (const client of [cs.client, warehouse.client, customerA.client, anon()]) {
      const { error } = await client.rpc("import_commit_batch", {
        p_batch_id: batch!.id,
        p_limit: 1,
      });
      assert.ok(error, "harus ditolak");
    }
    const { data, error } = await adminUser.client.rpc("import_commit_batch", {
      p_batch_id: batch!.id,
      p_limit: 1,
    });
    assert.ifError(error);
    assert.deepEqual(data, { committed: 0, failed: 0, remaining: 0 });
    await admin.from("import_batches").delete().eq("id", batch!.id);
  });
});

describe("regresi trigger cache varian", () => {
  test("admin bisa mengubah kolom non-cache varian", async () => {
    const { data: v } = await admin
      .from("product_variants")
      .select("id, name")
      .eq("sku", "DEMO-WPR-101-14")
      .single();
    const { data, error } = await adminUser.client
      .from("product_variants")
      .update({ name: `${v!.name} ${RUN_ID}` })
      .eq("id", v!.id)
      .select("id");
    assert.ifError(error);
    assert.equal(data?.length, 1);
    await admin.from("product_variants").update({ name: v!.name }).eq("id", v!.id);
  });

  test("stok varian tetap tidak bisa diubah langsung", async () => {
    const { data: v } = await admin
      .from("product_variants")
      .select("id")
      .eq("sku", "DEMO-WPR-101-14")
      .single();
    const { error } = await adminUser.client
      .from("product_variants")
      .update({ stock: 999 })
      .eq("id", v!.id);
    assert.ok(error);
  });
});

describe("katalog storefront (Fase 4)", () => {
  test("RPC katalog & fitment tidak membocorkan produk draft", async () => {
    const sku = `RLS-DRAFT-${RUN_ID}`.toUpperCase();
    const { data: product, error } = await admin
      .from("products")
      .insert({
        name: `Produk draft ${RUN_ID}`,
        slug: `rls-draft-${RUN_ID}`,
        sku,
        price: 1000,
        status: "draft",
      })
      .select("id")
      .single();
    assert.ifError(error);
    const { data: model } = await admin.from("vehicle_models").select("id").limit(1).single();
    await admin.from("product_fitments").insert({
      product_id: product!.id,
      model_id: model!.id,
      is_verified: false,
      source: "import",
    });

    const { data: search } = await anon().rpc("catalog_search", { p_query: sku });
    assert.equal((search ?? []).length, 0, "draft tidak boleh muncul di catalog_search");

    const { data: vehicleSearch } = await anon().rpc("catalog_search", {
      p_model_id: model!.id,
      p_vehicle_only: true,
      p_limit: 60,
    });
    assert.ok(
      !(vehicleSearch ?? []).some((r) => r.id === product!.id),
      "draft tidak boleh muncul lewat filter kendaraan",
    );

    const { data: facets } = await anon().rpc("catalog_facets", { p_query: sku });
    assert.deepEqual((facets as { brands: unknown[] }).brands, []);

    const { data: fitments } = await anon()
      .from("product_fitments")
      .select("id")
      .eq("product_id", product!.id);
    assert.equal(fitments?.length ?? 0, 0, "fitment produk draft tersembunyi");

    // staf tetap tidak melihat draft lewat RPC storefront (selalu published)
    const { data: staffSearch } = await adminUser.client.rpc("catalog_search", { p_query: sku });
    assert.equal((staffSearch ?? []).length, 0);

    await admin.from("products").delete().eq("id", product!.id);
  });

  test("public_reviews hanya ulasan published dengan nama disamarkan", async () => {
    const { data, error } = await anon().rpc("public_reviews", { p_limit: 30 });
    assert.ifError(error);
    for (const r of data ?? []) {
      assert.ok(!/@/.test(r.reviewer), "nama pengulas tidak boleh berisi email");
      assert.ok(r.reviewer.split(" ").length <= 2);
    }
  });
});

describe("checkout (Fase 5)", () => {
  // customerB sudah dijadikan staf (cs) oleh test role di atas.
  let outsider: TestUser;
  let productId: string;
  let voucherId: string;
  const voucherCode = `RLS${RUN_ID}`.toUpperCase();
  const address = {
    recipient: "Uji",
    phone: "081234567890",
    city: "Bandung",
    postal_code: "40132",
  };
  const shipping = { courier_code: "uji", courier_service: "reg", cost: 10000 };
  const items = (quantity = 2) => [
    { product_id: productId, variant_id: null, quantity, unit_price: 1 },
  ];

  before(async () => {
    outsider = await createTestUser("customer");
    const { data: product, error } = await admin
      .from("products")
      .insert({
        name: `Produk checkout ${RUN_ID}`,
        slug: `rls-checkout-${RUN_ID}`,
        sku: `RLS-CO-${RUN_ID}`.toUpperCase(),
        price: 50000,
        status: "published",
      })
      .select("id")
      .single();
    if (error || !product) throw new Error(`produk checkout: ${error?.message}`);
    productId = product.id;
    const { error: stockError } = await admin
      .from("inventory_movements")
      .insert({ product_id: productId, quantity: 3, type: "initial" });
    if (stockError) throw new Error(`stok awal: ${stockError.message}`);

    const { data: voucher, error: vErr } = await admin
      .from("vouchers")
      .insert({
        code: voucherCode,
        discount_type: "percent",
        discount_value: 10,
        max_discount: 5000,
        per_user_limit: 1,
      })
      .select("id")
      .single();
    if (vErr || !voucher) throw new Error(`voucher: ${vErr?.message}`);
    voucherId = voucher.id;
  });

  after(async () => {
    const { data: rows } = await admin
      .from("order_items")
      .select("order_id")
      .eq("product_id", productId);
    const ids = [...new Set((rows ?? []).map((o) => o.order_id))];
    if (ids.length) await admin.from("orders").delete().in("id", ids);
    await admin.from("vouchers").delete().eq("id", voucherId);
    // Ledger stok append-only: produk uji diarsipkan, bukan dihapus.
    await admin.from("products").update({ status: "archived" }).eq("id", productId);
  });

  test("RPC tulis checkout tidak bisa dipanggil anon/authenticated", async () => {
    const args = {
      p_user: customerA.id,
      p_checkout_key: crypto.randomUUID(),
      p_items: items(),
      p_address: address,
      p_shipping: { ...shipping, cost: 0 },
      p_voucher_code: "",
      p_payment_provider: "mayar" as const,
    };
    for (const client of [anon(), customerA.client]) {
      const { error } = await client.rpc("place_order", args);
      assert.ok(error, "place_order wajib ditolak");
      const { error: qErr } = await client.rpc("checkout_quote", {
        p_user: customerA.id,
        p_items: items(),
      });
      assert.ok(qErr, "checkout_quote wajib ditolak");
      const { error: rErr } = await client.rpc("release_expired_orders");
      assert.ok(rErr, "release_expired_orders wajib ditolak");
    }
  });

  test("cart_lines publik: harga dari DB, draft tidak bocor", async () => {
    const { data, error } = await anon().rpc("cart_lines", { p_items: items() });
    assert.ifError(error);
    assert.equal(data?.[0]?.unit_price, 50000);
    assert.equal(data?.[0]?.status, "ok");

    const { data: draft } = await admin
      .from("products")
      .select("id")
      .eq("status", "draft")
      .limit(1)
      .maybeSingle();
    if (draft) {
      const { data: hidden } = await anon().rpc("cart_lines", {
        p_items: [{ product_id: draft.id, variant_id: null, quantity: 1 }],
      });
      assert.equal(hidden?.[0]?.status, "unavailable");
      assert.equal(hidden?.[0]?.product_name, null);
    }
  });

  test("keranjang user lain tidak terbaca atau diubah", async () => {
    const { data: cart, error } = await customerA.client
      .from("carts")
      .upsert({ user_id: customerA.id }, { onConflict: "user_id" })
      .select("id")
      .single();
    assert.ifError(error);
    const { error: itemErr } = await customerA.client
      .from("cart_items")
      .insert({ cart_id: cart!.id, product_id: productId, quantity: 2 });
    assert.ifError(itemErr);

    const { data: seen } = await outsider.client
      .from("cart_items")
      .select("id")
      .eq("cart_id", cart!.id);
    assert.equal(seen?.length ?? 0, 0);
    const { error: injectErr } = await outsider.client
      .from("cart_items")
      .insert({ cart_id: cart!.id, product_id: productId, quantity: 1 });
    assert.ok(injectErr, "tidak boleh menambah ke keranjang orang lain");
  });

  test("place_order: total dari DB, reservasi, idempotent, voucher, expired", async () => {
    const args = {
      p_user: customerA.id,
      p_checkout_key: crypto.randomUUID(),
      p_items: items(),
      p_address: address,
      p_shipping: shipping,
      p_voucher_code: voucherCode.toLowerCase(),
      p_payment_provider: "mayar" as const,
    };
    const { data, error } = await admin.rpc("place_order", args);
    assert.ifError(error);
    const created = data as { order_id: string; order_number: string; created: boolean };
    assert.equal(created.created, true);

    const { data: order } = await admin
      .from("orders")
      .select("subtotal, discount_total, shipping_cost, grand_total, status")
      .eq("id", created.order_id)
      .single();
    // unit_price palsu di input diabaikan: 2 × 50.000, diskon 10% maks 5.000
    assert.equal(Number(order!.subtotal), 100000);
    assert.equal(Number(order!.discount_total), 5000);
    assert.equal(Number(order!.grand_total), 105000);
    assert.equal(order!.status, "pending_payment");

    // stok tersedia turun (3 − 2); baris keranjang yang dibeli terhapus
    const { data: lines } = await anon().rpc("cart_lines", { p_items: items() });
    assert.equal(lines?.[0]?.available, 1);
    assert.equal(lines?.[0]?.status, "insufficient");
    const { data: cartLeft } = await customerA.client
      .from("cart_items")
      .select("id")
      .eq("product_id", productId);
    assert.equal(cartLeft?.length ?? 0, 0);

    // pesanan A tidak terbaca B
    const { data: seenByB } = await outsider.client
      .from("orders")
      .select("id")
      .eq("id", created.order_id);
    assert.equal(seenByB?.length ?? 0, 0);

    // checkout_key sama: pesanan yang sama
    const { data: again } = await admin.rpc("place_order", args);
    assert.equal((again as { order_id: string }).order_id, created.order_id);
    assert.equal((again as { created: boolean }).created, false);

    // stok kurang ditolak
    const { error: stockErr } = await admin.rpc("place_order", {
      ...args,
      p_checkout_key: crypto.randomUUID(),
      p_voucher_code: "",
    });
    assert.match(stockErr?.message ?? "", /Stok/);

    // lewat batas bayar: expired, stok & voucher kembali
    await admin
      .from("orders")
      .update({ payment_due_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", created.order_id);
    const { data: expired, error: expErr } = await admin.rpc("release_expired_orders");
    assert.ifError(expErr);
    assert.ok((expired ?? []).some((r) => r.order_id === created.order_id));
    const { data: afterExpire } = await admin
      .from("orders")
      .select("status")
      .eq("id", created.order_id)
      .single();
    assert.equal(afterExpire!.status, "expired");
    const { data: restored } = await anon().rpc("cart_lines", { p_items: items() });
    assert.equal(restored?.[0]?.available, 3);
    const { data: v } = await admin
      .from("vouchers")
      .select("used_count")
      .eq("id", voucherId)
      .single();
    assert.equal(v!.used_count, 0);

    // per_user_limit 1: dipakai lagi berhasil (redemption dilepas), berikutnya ditolak
    const second = { ...args, p_checkout_key: crypto.randomUUID(), p_items: items(1) };
    const { error: okAgain } = await admin.rpc("place_order", second);
    assert.ifError(okAgain);
    const { error: limitErr } = await admin.rpc("place_order", {
      ...second,
      p_checkout_key: crypto.randomUUID(),
    });
    assert.match(limitErr?.message ?? "", /sudah memakai voucher/);
  });
});

describe("pembayaran (Fase 6)", () => {
  let buyer: TestUser;
  let productId: string;

  const placeOrder = async () => {
    const { data, error } = await admin.rpc("place_order", {
      p_user: buyer.id,
      p_checkout_key: crypto.randomUUID(),
      p_items: [{ product_id: productId, variant_id: null, quantity: 2 }],
      p_address: { recipient: "Uji", phone: "081234567890" },
      p_shipping: { courier_code: "uji", courier_service: "reg", cost: 10000 },
      p_voucher_code: "",
      p_payment_provider: "mayar",
    });
    if (error) throw new Error(`place_order: ${error.message}`);
    const orderId = (data as { order_id: string }).order_id;
    const { data: pay, error: payErr } = await admin
      .from("payments")
      .insert({
        order_id: orderId,
        provider: "mayar",
        provider_ref: `TEST-${crypto.randomUUID()}`,
        status: "pending",
        amount: 110000,
      })
      .select("id")
      .single();
    if (payErr || !pay) throw new Error(`payment: ${payErr?.message}`);
    return { orderId, paymentId: pay.id };
  };

  const stockOf = async () => {
    const { data } = await admin
      .from("products")
      .select("stock, total_sold")
      .eq("id", productId)
      .single();
    return data!;
  };

  before(async () => {
    buyer = await createTestUser("customer");
    const { data: product, error } = await admin
      .from("products")
      .insert({
        name: `Produk bayar ${RUN_ID}`,
        slug: `rls-pay-${RUN_ID}`,
        sku: `RLS-PAY-${RUN_ID}`.toUpperCase(),
        price: 50000,
        status: "published",
      })
      .select("id")
      .single();
    if (error || !product) throw new Error(`produk bayar: ${error?.message}`);
    productId = product.id;
    await admin
      .from("inventory_movements")
      .insert({ product_id: productId, quantity: 10, type: "initial" });
    await admin.from("store_settings").update({ mayar_enabled: true }).eq("id", true);
  });

  after(async () => {
    await admin.from("orders").delete().eq("user_id", buyer.id);
    await admin.from("products").update({ status: "archived" }).eq("id", productId);
  });

  test("mark_order_paid tidak bisa dipanggil anon/authenticated", async () => {
    for (const client of [anon(), buyer.client]) {
      const { error } = await client.rpc("mark_order_paid", {
        p_payment_id: crypto.randomUUID(),
        p_amount: 1,
      });
      assert.ok(error, "mark_order_paid wajib ditolak");
    }
  });

  test("lunas: stok final, reservasi consumed, idempotent, nominal salah ditolak", async () => {
    const { orderId, paymentId } = await placeOrder();
    const before = await stockOf();

    const { data: mismatch } = await admin.rpc("mark_order_paid", {
      p_payment_id: paymentId,
      p_amount: 1,
    });
    assert.equal(mismatch, "amount_mismatch");
    const { data: stillPending } = await admin
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();
    assert.equal(stillPending!.status, "pending_payment");

    const { data: settled, error } = await admin.rpc("mark_order_paid", {
      p_payment_id: paymentId,
      p_amount: 110000,
      p_method: "qris",
      p_transaction_ref: "tx-uji",
    });
    assert.ifError(error);
    assert.equal(settled, "settled");

    const { data: order } = await admin
      .from("orders")
      .select("status, paid_at")
      .eq("id", orderId)
      .single();
    assert.equal(order!.status, "paid");
    assert.ok(order!.paid_at);
    const { data: res } = await admin
      .from("stock_reservations")
      .select("status")
      .eq("order_id", orderId);
    assert.ok((res ?? []).every((r) => r.status === "consumed"));
    const after = await stockOf();
    assert.equal(after.stock, before.stock - 2);
    assert.equal(after.total_sold, before.total_sold + 2);
    const { data: moves } = await admin
      .from("inventory_movements")
      .select("quantity, type")
      .eq("reference_id", orderId);
    assert.deepEqual(moves, [{ quantity: -2, type: "sale" }]);

    const { data: again } = await admin.rpc("mark_order_paid", {
      p_payment_id: paymentId,
      p_amount: 110000,
    });
    assert.equal(again, "already_paid");
    assert.equal((await stockOf()).stock, before.stock - 2, "tidak boleh mengurangi stok dua kali");

    // pembeli bisa membaca payment & notifikasi miliknya, user lain tidak
    const { data: own } = await buyer.client.from("payments").select("status").eq("id", paymentId);
    assert.equal(own?.[0]?.status, "paid");
    const { data: other } = await customerA.client
      .from("payments")
      .select("id")
      .eq("id", paymentId);
    assert.equal(other?.length ?? 0, 0);
    const { data: notif } = await buyer.client
      .from("notifications")
      .select("type")
      .eq("type", "payment_received");
    assert.ok((notif?.length ?? 0) >= 1);
  });

  test("bayar setelah expired: paid_after_cancel, stok tidak berkurang", async () => {
    const { orderId, paymentId } = await placeOrder();
    await admin
      .from("orders")
      .update({ payment_due_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", orderId);
    const { data: released } = await admin.rpc("release_expired_orders");
    const row = (released ?? []).find((r) => r.order_id === orderId);
    assert.ok(row, "pesanan ikut expired");
    assert.ok(row.provider_ref?.startsWith("TEST-"));
    const { data: pay } = await admin
      .from("payments")
      .select("status")
      .eq("id", paymentId)
      .single();
    assert.equal(pay!.status, "expired");

    const before = await stockOf();
    const { data: late } = await admin.rpc("mark_order_paid", {
      p_payment_id: paymentId,
      p_amount: 110000,
    });
    assert.equal(late, "paid_after_cancel");
    assert.equal((await stockOf()).stock, before.stock);
    const { data: order } = await admin.from("orders").select("status").eq("id", orderId).single();
    assert.equal(order!.status, "expired");
  });
});

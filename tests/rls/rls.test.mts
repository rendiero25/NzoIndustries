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

/**
 * Kerangka sumber data API Jubelio (P-04: akses API belum ada).
 * Item API dipetakan ke `JubelioExportGroup` supaya memakai pipeline yang sama
 * dengan export XLS (normalisasi SKU, nama, kategori, brand, varian).
 *
 * PENTING: bentuk respons di bawah adalah asumsi dari dokumentasi publik
 * Jubelio dan WAJIB diverifikasi saat kredensial integrasi tersedia.
 */
import type { JubelioExportGroup } from "./jubelio-export.ts";

export type JubelioApiVariant = {
  item_id: number;
  item_code: string;
  sell_price: number | null;
  variation_values?: { label: string; value: string }[] | null;
  end_qty?: number | null;
  weight_in_gram?: number | null;
  images?: { url: string }[] | null;
};

export type JubelioApiItemGroup = {
  item_group_id: number;
  item_group_name: string;
  variants: JubelioApiVariant[];
};

export interface JubelioSource {
  listItemGroups(
    page: number,
    pageSize: number,
  ): Promise<{ items: JubelioApiItemGroup[]; total: number }>;
}

export type JubelioCredentials = { baseUrl: string; email: string; password: string };

/** Klien HTTP minimal. Endpoint ditandai TODO sampai diverifikasi (P-04). */
export function createJubelioClient(
  creds: JubelioCredentials,
  fetchImpl: typeof fetch = fetch,
): JubelioSource {
  let token: string | null = null;

  async function login(): Promise<string> {
    // TODO(P-04): verifikasi endpoint login & bentuk respons.
    const res = await fetchImpl(`${creds.baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: creds.email, password: creds.password }),
    });
    if (!res.ok) throw new Error(`Login Jubelio gagal (${res.status})`);
    const json = (await res.json()) as { token?: string };
    if (!json.token) throw new Error("Respons login Jubelio tanpa token");
    return json.token;
  }

  return {
    async listItemGroups(page, pageSize) {
      token ??= await login();
      // TODO(P-04): verifikasi path, parameter paging, dan nama field.
      const url = `${creds.baseUrl}/inventory/items/?page=${page}&pageSize=${pageSize}`;
      const res = await fetchImpl(url, { headers: { Authorization: token } });
      if (!res.ok) throw new Error(`Gagal mengambil item Jubelio (${res.status})`);
      const json = (await res.json()) as { data?: JubelioApiItemGroup[]; totalCount?: number };
      return { items: json.data ?? [], total: json.totalCount ?? 0 };
    },
  };
}

/** Item API → grup yang sama dengan baris export (dipetakan oleh mapJubelioGroups). */
export function apiItemToGroup(item: JubelioApiItemGroup, rowIndex: number): JubelioExportGroup {
  return {
    rowIndex,
    name: item.item_group_name.trim(),
    rows: item.variants.map((v) => ({
      sku: v.item_code.trim(),
      variant: v.variation_values?.map((x) => x.value).join(" / ") || null,
      price: v.sell_price === null ? null : Math.round(v.sell_price),
      marketplacePrices: {},
    })),
  };
}

/** Ambil semua halaman. `onPage` untuk progres. */
export async function fetchAllItemGroups(
  source: JubelioSource,
  pageSize = 100,
  onPage?: (fetched: number, total: number) => void,
): Promise<JubelioApiItemGroup[]> {
  const all: JubelioApiItemGroup[] = [];
  for (let page = 1; page <= 1000; page++) {
    const { items, total } = await source.listItemGroups(page, pageSize);
    all.push(...items);
    onPage?.(all.length, total);
    if (items.length < pageSize || all.length >= total) break;
  }
  return all;
}

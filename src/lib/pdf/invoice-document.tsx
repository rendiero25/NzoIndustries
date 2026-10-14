import "server-only";

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { ORDER_STATUS_META } from "@/lib/orders/status";
import type { DocumentOrder, StoreInfo } from "@/server/queries/documents";

import {
  addressLines,
  formatWibDate,
  formatWibDateTime,
  paymentMethodLabel,
  rupiah,
} from "./format";

const INK = "#0E0F11";
const MUTED = "#5B6068";
const LINE = "#D9DBDF";

const s = StyleSheet.create({
  page: {
    fontFamily: "Outfit",
    fontSize: 9.5,
    color: INK,
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
  },
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  logo: { width: 120, height: 34, objectFit: "contain", objectPosition: "left" },
  title: { fontSize: 22, fontWeight: 700, letterSpacing: 1 },
  muted: { color: MUTED },
  label: {
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  strong: { fontWeight: 600 },
  stamp: {
    marginTop: 6,
    alignSelf: "flex-end",
    borderWidth: 1.2,
    borderColor: INK,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  box: { flex: 1, borderWidth: 0.8, borderColor: LINE, borderRadius: 4, padding: 10 },
  th: {
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingVertical: 6,
  },
  td: { paddingVertical: 7 },
  tr: { flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: LINE },
  cName: { flex: 1, paddingRight: 8 },
  cQty: { width: 36, textAlign: "right" },
  cPrice: { width: 80, textAlign: "right" },
  cTotal: { width: 88, textAlign: "right" },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1.2,
    borderTopColor: INK,
    fontSize: 12,
    fontWeight: 700,
  },
  footer: {
    position: "absolute",
    left: 44,
    right: 44,
    bottom: 28,
    fontSize: 8,
    color: MUTED,
    borderTopWidth: 0.6,
    borderTopColor: LINE,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

const CANCELLED = new Set(["refunded", "cancelled", "expired"]);

export function InvoiceDocument({
  order,
  store,
  logo,
}: {
  order: DocumentOrder;
  store: StoreInfo;
  logo: Buffer;
}) {
  const a = order.address;
  const name = typeof a.recipient === "string" ? a.recipient : "—";
  const phone = typeof a.phone === "string" ? a.phone : null;
  const statusLabel = CANCELLED.has(order.status)
    ? (ORDER_STATUS_META[order.status as keyof typeof ORDER_STATUS_META]?.label ?? order.status)
    : "Lunas";
  const contact = [store.email, store.whatsapp ? `WA ${store.whatsapp}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document
      title={`Invoice ${order.invoiceNumber}`}
      author={store.name}
      creator={store.name}
      producer={store.name}
    >
      <Page size="A4" style={s.page}>
        <View style={s.between}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image react-pdf tidak punya alt */}
            <Image src={logo} style={s.logo} />
            <Text style={[s.muted, { marginTop: 6 }]}>{store.name}</Text>
            {contact ? <Text style={s.muted}>{contact}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.title}>INVOICE</Text>
            <Text style={[s.strong, { marginTop: 4 }]}>{order.invoiceNumber}</Text>
            <Text style={s.stamp}>{statusLabel}</Text>
          </View>
        </View>

        <View style={[s.row, { marginTop: 22, gap: 12 }]}>
          <View style={s.box}>
            <Text style={s.label}>Ditagihkan & dikirim ke</Text>
            <Text style={s.strong}>{name}</Text>
            {phone ? <Text>{phone}</Text> : null}
            {addressLines(a).map((l) => (
              <Text key={l}>{l}</Text>
            ))}
          </View>
          <View style={s.box}>
            <Text style={s.label}>Detail</Text>
            {(
              [
                ["Tanggal invoice", formatWibDate(order.invoiceIssuedAt)],
                ["No. pesanan", order.orderNumber],
                ["Tanggal pesan", formatWibDateTime(order.createdAt)],
                ["Dibayar", formatWibDateTime(order.payment?.paidAt ?? order.paidAt)],
                [
                  "Metode bayar",
                  paymentMethodLabel(
                    order.payment?.method ?? null,
                    order.payment?.provider ?? null,
                  ),
                ],
              ] as const
            ).map(([k, v]) => (
              <View key={k} style={[s.between, { paddingVertical: 1.5 }]}>
                <Text style={s.muted}>{k}</Text>
                <Text>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 22 }}>
          <View style={[s.tr, { borderBottomColor: INK, borderBottomWidth: 1 }]}>
            <Text style={[s.th, s.cName]}>Produk</Text>
            <Text style={[s.th, s.cQty]}>Qty</Text>
            <Text style={[s.th, s.cPrice]}>Harga</Text>
            <Text style={[s.th, s.cTotal]}>Subtotal</Text>
          </View>
          {order.items.map((i, idx) => (
            <View key={`${i.sku}-${idx}`} style={s.tr} wrap={false}>
              <View style={[s.td, s.cName]}>
                <Text style={s.strong}>{i.name}</Text>
                <Text style={[s.muted, { fontSize: 8 }]}>
                  {i.variant ? `${i.variant} · ` : ""}SKU {i.sku}
                </Text>
              </View>
              <Text style={[s.td, s.cQty]}>{i.quantity}</Text>
              <Text style={[s.td, s.cPrice]}>{rupiah(i.unitPrice)}</Text>
              <Text style={[s.td, s.cTotal]}>{rupiah(i.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 12, marginLeft: "auto", width: 220 }} wrap={false}>
          <View style={s.sumRow}>
            <Text style={s.muted}>Subtotal</Text>
            <Text>{rupiah(order.subtotal)}</Text>
          </View>
          <View style={s.sumRow}>
            <Text style={s.muted}>Ongkos kirim</Text>
            <Text>{rupiah(order.shippingCost)}</Text>
          </View>
          {order.discountTotal > 0 ? (
            <View style={s.sumRow}>
              <Text style={s.muted}>
                Diskon{order.voucherCode ? ` (${order.voucherCode})` : ""}
              </Text>
              <Text>{rupiah(-order.discountTotal)}</Text>
            </View>
          ) : null}
          <View style={s.grand}>
            <Text>Total</Text>
            <Text>{rupiah(order.grandTotal)}</Text>
          </View>
          {store.taxMode === "ppn_included" ? (
            <Text style={[s.muted, { marginTop: 4, fontSize: 8, textAlign: "right" }]}>
              Harga sudah termasuk PPN.
            </Text>
          ) : null}
        </View>

        <View style={s.footer} fixed>
          <Text>{store.name} · Invoice ini sah tanpa tanda tangan.</Text>
          <Text render={({ pageNumber, totalPages }) => `Hal. ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

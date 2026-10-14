import "server-only";

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { DocumentOrder, StoreInfo } from "@/server/queries/documents";

import { addressLines, formatWeight, formatWibDate } from "./format";

export type LabelPage = {
  order: DocumentOrder;
  barcode: Buffer;
  barcodeText: string;
  hasWaybill: boolean;
  courierName: string;
  courierLogo: Buffer | null;
  weightGrams: number;
};

const s = StyleSheet.create({
  page: { fontFamily: "Outfit", fontSize: 9.5, color: "#000", padding: 18 },
  frame: { flex: 1, borderWidth: 1.5, borderColor: "#000" },
  section: { borderBottomWidth: 1, borderBottomColor: "#000", padding: 8 },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { width: 92, height: 26, objectFit: "contain" },
  courierLogo: { width: 70, height: 26, objectFit: "contain" },
  label: {
    fontSize: 7.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  name: { fontSize: 12, fontWeight: 700 },
  big: { fontSize: 11, fontWeight: 700 },
  barcode: { height: 62, objectFit: "contain", marginVertical: 4 },
  cell: { flex: 1, padding: 6, borderRightWidth: 1, borderRightColor: "#000" },
  cellLast: { flex: 1, padding: 6 },
  item: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 },
});

function ShipperBlock({ store }: { store: StoreInfo }) {
  const sh = store.shipper;
  const missing = !sh.address || !sh.phone;
  return (
    <View style={s.section}>
      <Text style={s.label}>Pengirim</Text>
      <Text style={s.big}>{sh.name || store.name}</Text>
      {sh.phone ? <Text>{sh.phone}</Text> : null}
      {sh.address ? <Text>{sh.address}</Text> : null}
      {sh.postalCode ? <Text>{sh.postalCode}</Text> : null}
      {missing ? (
        <Text style={{ fontWeight: 700 }}>[Data pengirim belum lengkap di Pengaturan]</Text>
      ) : null}
    </View>
  );
}

export function LabelDocument({
  pages,
  store,
  logo,
}: {
  pages: LabelPage[];
  store: StoreInfo;
  logo: Buffer;
}) {
  return (
    <Document
      title={
        pages.length === 1 ? `Resi ${pages[0]!.order.orderNumber}` : `Resi ${pages.length} pesanan`
      }
      author={store.name}
    >
      {pages.map((p) => {
        const a = p.order.address;
        const recipient = typeof a.recipient === "string" ? a.recipient : "—";
        const phone = typeof a.phone === "string" ? a.phone : "";
        const service = p.order.shipment
          ? `${p.courierName} ${p.order.shipment.courierService.toUpperCase()}`
          : p.courierName;
        return (
          <Page key={p.order.orderNumber} size="A5" style={s.page}>
            <View style={s.frame}>
              <View style={[s.section, s.between]}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- Image react-pdf tidak punya alt */}
                <Image src={logo} style={s.logo} />
                <View style={{ alignItems: "flex-end" }}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text -- Image react-pdf tidak punya alt */}
                  {p.courierLogo ? <Image src={p.courierLogo} style={s.courierLogo} /> : null}
                  <Text style={s.big}>{service}</Text>
                </View>
              </View>

              <View style={[s.section, { alignItems: "center" }]}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- Image react-pdf tidak punya alt */}
                <Image src={p.barcode} style={s.barcode} />
                <Text style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5 }}>
                  {p.barcodeText}
                </Text>
                {!p.hasWaybill ? (
                  <Text style={{ fontSize: 8 }}>Nomor pesanan · belum ada resi kurir</Text>
                ) : null}
              </View>

              <View style={s.section}>
                <Text style={s.label}>Penerima</Text>
                <Text style={s.name}>{recipient}</Text>
                {phone ? <Text style={s.big}>{phone}</Text> : null}
                {addressLines(a).map((l) => (
                  <Text key={l}>{l}</Text>
                ))}
              </View>

              <ShipperBlock store={store} />

              <View style={[s.section, { flexDirection: "row", padding: 0 }]}>
                <View style={[s.cell, { flex: 1.5 }]}>
                  <Text style={s.label}>No. pesanan</Text>
                  <Text style={{ fontWeight: 600 }}>{p.order.orderNumber}</Text>
                </View>
                <View style={s.cell}>
                  <Text style={s.label}>Berat</Text>
                  <Text style={{ fontWeight: 600 }}>{formatWeight(p.weightGrams)}</Text>
                </View>
                <View style={s.cell}>
                  <Text style={s.label}>Bayar</Text>
                  <Text style={{ fontWeight: 600 }}>NON-COD</Text>
                </View>
                <View style={s.cellLast}>
                  <Text style={s.label}>Tanggal</Text>
                  <Text style={{ fontWeight: 600 }}>
                    {formatWibDate(p.order.paidAt ?? p.order.createdAt)}
                  </Text>
                </View>
              </View>

              <View style={{ padding: 8 }}>
                <Text style={s.label}>Isi paket</Text>
                {p.order.items.slice(0, 8).map((i, idx) => (
                  <View key={`${i.sku}-${idx}`} style={s.item}>
                    <Text style={{ flex: 1, paddingRight: 6 }}>
                      {i.name}
                      {i.variant ? ` (${i.variant})` : ""}
                    </Text>
                    <Text style={{ fontWeight: 700 }}>×{i.quantity}</Text>
                  </View>
                ))}
                {p.order.items.length > 8 ? (
                  <Text>+{p.order.items.length - 8} item lain</Text>
                ) : null}
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}

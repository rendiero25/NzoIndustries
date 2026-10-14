import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import { BITESHIP_COURIER_BRANDS } from "@/lib/biteship/courier-brands";
import { getServerEnv } from "@/lib/env";
import type { DocumentOrder, StoreInfo } from "@/server/queries/documents";

import { code128Png, courierLogo, ensurePdfFonts, nzoLogo } from "./assets";
import { documentFileName, packageWeightGrams } from "./format";
import { InvoiceDocument } from "./invoice-document";
import { LabelDocument, type LabelPage } from "./label-document";

export function pdfResponse(
  buffer: Buffer,
  fileName: string,
  disposition: "inline" | "attachment" = "inline",
) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${documentFileName(fileName)}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function renderInvoicePdf(order: DocumentOrder, store: StoreInfo): Promise<Buffer> {
  ensurePdfFonts();
  return renderToBuffer(<InvoiceDocument order={order} store={store} logo={nzoLogo()} />);
}

export async function renderLabelsPdf(orders: DocumentOrder[], store: StoreInfo): Promise<Buffer> {
  ensurePdfFonts();
  const defaultGrams = getServerEnv().DEFAULT_ITEM_WEIGHT_GRAMS;
  const pages: LabelPage[] = await Promise.all(
    orders.map(async (order) => {
      const waybill = order.shipment?.waybill?.trim() || null;
      const text = waybill ?? order.orderNumber;
      const brand = BITESHIP_COURIER_BRANDS.find(
        (b) => b.code === order.shipment?.courierCode?.toLowerCase(),
      );
      return {
        order,
        barcode: await code128Png(text),
        barcodeText: text,
        hasWaybill: !!waybill,
        courierName: brand?.name ?? order.shipment?.courierCode?.toUpperCase() ?? "Kurir",
        courierLogo: courierLogo(brand?.logo),
        weightGrams: packageWeightGrams(order.items, defaultGrams),
      };
    }),
  );
  return renderToBuffer(<LabelDocument pages={pages} store={store} logo={nzoLogo()} />);
}

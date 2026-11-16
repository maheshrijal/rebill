import init, { render } from "takumi-pdf/no-init";
import wasmUrl from "takumi-pdf/wasm-url";

import latin400 from "@fontsource/mukta/files/mukta-latin-400-normal.woff2?url";
import latin600 from "@fontsource/mukta/files/mukta-latin-600-normal.woff2?url";
import latinExt400 from "@fontsource/mukta/files/mukta-latin-ext-400-normal.woff2?url";
import latinExt600 from "@fontsource/mukta/files/mukta-latin-ext-600-normal.woff2?url";
import subsets from "@fontsource/mukta/unicode.json";

import { FONT_FAMILY, InvoiceDocument } from "./invoice-document";
import type { InvoiceData } from "./types";

// "U+0100-02BA,U+2020" -> [[0x100, 0x2ba], [0x2020, 0x2020]]
const parseRanges = (css: string): [number, number][] =>
  css.split(",").map((part) => {
    const [lo, hi = lo] = part.replace("U+", "").split("-");
    return [parseInt(lo, 16), parseInt(hi, 16)];
  });

// latin-ext carries ₹ and most other currency signs.
const fonts = [
  { url: latin400, weight: 400, subset: subsets.latin },
  { url: latin600, weight: 600, subset: subsets.latin },
  { url: latinExt400, weight: 400, subset: subsets["latin-ext"] },
  { url: latinExt600, weight: 600, subset: subsets["latin-ext"] },
].map(({ url, weight, subset }) => ({
  key: url,
  name: FONT_FAMILY,
  weight,
  unicodeRange: parseRanges(subset),
  generic: "sans-serif" as const,
  data: () => fetch(url).then((res) => res.arrayBuffer()),
}));

let ready: Promise<unknown> | undefined;

/** Downloads and starts the WASM renderer once. Safe to call early. */
export function loadRenderer(): Promise<unknown> {
  ready ??= init({ module_or_path: wasmUrl }).catch((error) => {
    ready = undefined; // let the next call retry
    throw error;
  });
  return ready;
}

export async function renderInvoicePdf(data: InvoiceData): Promise<Blob> {
  await loadRenderer();

  const bytes = await render(<InvoiceDocument data={data} />, {
    size: "a4",
    margin: 40,
    fonts,
    metadata: {
      title: `Invoice ${data.invoice.number || "draft"}`,
      authors: [data.seller.name || "Rebill"],
      description: `Invoice for ${data.billTo.name || "Customer"}`,
      creator: "Rebill - Invoice Generator",
    },
  });
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
}

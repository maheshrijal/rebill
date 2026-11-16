import { KeyValue } from "@/components/pdf/key-value/key-value";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/pdf/table/table";
import { Text } from "@/components/pdf/text/text";
import { PdfcnThemeProvider } from "@/components/pdf/theme-provider";
import { professionalTheme } from "@/lib/pdf-themes/professional";
import { Document, Page, View } from "@/lib/pdf-primitives";
import type { PdfcnTheme } from "@/types/pdf-themes";
import { formatCurrency, formatDate } from "@/js/modules/formatters.js";

import type { InvoiceData } from "./types";

export const FONT_FAMILY = "Mukta";

// Ink on white paper, with one violet "rubber stamp" accent for the amount due.
const color = {
  paper: "#ffffff",
  ink: "#1e2b3a",
  graphite: "#5e6b7a",
  rule: "#d5dce3",
  stamp: "#4b3a8f",
};

const theme: PdfcnTheme = {
  ...professionalTheme,
  colors: {
    ...professionalTheme.colors,
    background: color.paper,
    border: color.rule,
    foreground: color.ink,
    mutedForeground: color.graphite,
    primary: color.ink,
  },
  typography: {
    ...professionalTheme.typography,
    body: { fontFamily: FONT_FAMILY, fontSize: 10, lineHeight: 1.45 },
    heading: { ...professionalTheme.typography.heading, fontFamily: FONT_FAMILY },
  },
};

// Figures share one width so amounts line up down a column.
const figures = { fontVariantNumeric: "tabular-nums" };
const label = { color: color.graphite, fontSize: 10, marginBottom: 2 };
const SECTION_GAP = 28;
// Table text lines up with the content above it.
const headCell = { textTransform: "none" };
const firstCell = { paddingLeft: 0 };
const lastCell = { paddingRight: 0 };

const Lines = ({ lines }: { lines: string[] }) => (
  <>
    {lines.filter(Boolean).map((line, i) => (
      <Text key={i} color={color.graphite} noMargin>
        {line}
      </Text>
    ))}
  </>
);

const InvoiceContent = ({ data }: { data: InvoiceData }) => {
  const { seller, billTo, invoice, items, totals, settings } = data;
  const fmt = (amount: number) =>
    formatCurrency(amount, settings.currency, settings.locale);
  const number = invoice.number || "draft";

  const adjustments = [];
  if (totals.taxAmount > 0 || totals.discount > 0) {
    adjustments.push({ key: "Subtotal", value: fmt(totals.subtotal), valueStyle: figures });
    if (totals.taxAmount > 0) {
      adjustments.push({ key: `Tax (${totals.taxRate}%)`, value: fmt(totals.taxAmount), valueStyle: figures });
    }
    if (totals.discount > 0) {
      adjustments.push({ key: "Discount", value: `-${fmt(totals.discount)}`, valueStyle: figures });
    }
  }

  return (
    <Document title={`Invoice ${number}`}>
      <Page size="A4">
        {/* Who is billing, and which invoice this is */}
        <View style={{ flexDirection: "row", gap: 24, marginBottom: SECTION_GAP }}>
          <View style={{ flex: 1 }}>
            <Text noMargin style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.1, marginBottom: 6 }}>
              {seller.name || "Business name"}
            </Text>
            <Lines lines={[seller.address, seller.email, seller.phone]} />
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text noMargin style={{ fontSize: 12, fontWeight: 600 }}>
              {invoice.title || "Invoice"}
            </Text>
            <Text noMargin color={color.graphite}>
              {`Invoice no. ${number}`}
            </Text>
            <Text noMargin color={color.graphite}>
              {`Issued ${formatDate(invoice.date)}`}
            </Text>
          </View>
        </View>

        {/* Who pays, how much, and by when */}
        <View
          style={{
            alignItems: "flex-start",
            flexDirection: "row",
            gap: 24,
            marginBottom: SECTION_GAP,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text noMargin style={label}>Billed to</Text>
            <Text noMargin style={{ fontSize: 12, fontWeight: 600 }}>
              {billTo.name || "Customer"}
            </Text>
            <Lines lines={[billTo.address, billTo.email, billTo.phone]} />
          </View>
          <View
            style={{
              borderColor: color.stamp,
              borderRadius: 3,
              borderStyle: "solid",
              borderWidth: 1.5,
              minWidth: 180,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text noMargin color={color.stamp}>Amount due</Text>
            <Text
              noMargin
              color={color.stamp}
              style={{ ...figures, fontSize: 24, fontWeight: 600, lineHeight: 1.15 }}
            >
              {fmt(totals.total)}
            </Text>
            {invoice.dueDate && (
              <Text noMargin color={color.stamp}>
                {`Due by ${formatDate(invoice.dueDate)}`}
              </Text>
            )}
          </View>
        </View>

        <Table variant="line">
          <TableHeader>
            <TableRow header>
              <TableCell header style={{ ...headCell, ...firstCell }}>Description</TableCell>
              <TableCell header align="right" width={44} style={headCell}>Qty</TableCell>
              <TableCell header align="right" width={96} style={headCell}>Unit price</TableCell>
              <TableCell header align="right" width={96} style={{ ...headCell, ...lastCell }}>Amount</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, i) => (
              <TableRow key={i}>
                <TableCell style={firstCell}>{item.description || ""}</TableCell>
                <TableCell align="right" width={44} style={figures}>{String(item.quantity)}</TableCell>
                <TableCell align="right" width={96} style={figures}>{fmt(item.unitPrice)}</TableCell>
                <TableCell align="right" width={96} style={{ ...figures, ...lastCell }}>{fmt(item.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <View style={{ alignSelf: "flex-end", marginBottom: SECTION_GAP, marginTop: 12, width: 236 }}>
          {adjustments.length > 0 && <KeyValue items={adjustments} />}
          <View style={{ borderTopColor: color.rule, borderTopStyle: "solid", borderTopWidth: 0.75, marginTop: 4, paddingTop: 4 }}>
            <KeyValue
              items={[{
                key: "Total",
                keyStyle: { color: color.ink, fontWeight: 600 },
                value: fmt(totals.total),
                valueStyle: { ...figures, fontWeight: 600 },
              }]}
            />
          </View>
        </View>

        {invoice.instructions && (
          <View style={{ marginBottom: 16, maxWidth: 360 }}>
            <Text noMargin style={label}>How to pay</Text>
            <Text noMargin>{invoice.instructions}</Text>
          </View>
        )}
        {invoice.notes && (
          <Text noMargin style={{ maxWidth: 360 }}>{invoice.notes}</Text>
        )}
      </Page>
    </Document>
  );
};

export const InvoiceDocument = ({ data }: { data: InvoiceData }) => (
  <PdfcnThemeProvider theme={theme}>
    <InvoiceContent data={data} />
  </PdfcnThemeProvider>
);

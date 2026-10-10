// Formato compartido de los reportes PDF (tamaño carta): encabezado con logo
// y datos de la tienda, pie con quién y cuándo se generó y número de página.
// Cada reporte sólo arma su contenido con estas piezas.
//
// Sólo se usa en el navegador y se carga con import() al dar "Exportar", para
// no sumar @react-pdf/renderer al bundle de las páginas.
import * as React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { STORE_INFO } from "@/lib/store-info";

// Helvetica (incluida en todo PDF) tiene acentos y ñ. Ojo: no trae el signo
// menos U+2212, por eso los montos negativos usan "-".
const INK = "#1c1917";
const MUTED = "#78716c";
const LINE = "#e7e5e4";

export const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: INK,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: INK,
  },
  brand: { flexDirection: "row", alignItems: "center" },
  logo: { width: 30, height: 39, marginRight: 10 },
  storeName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  storeLine: { fontSize: 8, color: MUTED, marginTop: 1 },
  titleBox: { alignItems: "flex-end", maxWidth: 230 },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right" },
  subtitle: { fontSize: 9, color: MUTED, marginTop: 2, textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: MUTED,
    borderTopWidth: 0.5,
    borderTopColor: LINE,
    paddingTop: 6,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    marginTop: 14,
    marginBottom: 6,
  },
  muted: { color: MUTED },
  bold: { fontFamily: "Helvetica-Bold" },
  // Tabla
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: INK,
    paddingBottom: 4,
    marginBottom: 2,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
    paddingVertical: 4,
  },
  // Resumen en cajas
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  summaryBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 4,
    padding: 8,
  },
  summaryLabel: { fontSize: 8, color: MUTED },
  summaryValue: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2 },
  summaryHint: { fontSize: 7.5, color: MUTED, marginTop: 1 },
  // Firmas
  signatures: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 48,
  },
  signature: {
    width: 180,
    borderTopWidth: 1,
    borderTopColor: INK,
    paddingTop: 4,
    textAlign: "center",
    fontSize: 8.5,
  },
});

export const pdfMoney = (amount: number) =>
  `${amount < 0 ? "-" : ""}$${Math.abs(amount).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// "2026-10-02" → "02/10/2026"
export const pdfDate = (ymd: string) => ymd.split("-").reverse().join("/");

export const pdfDateTime = (iso: string | Date) =>
  new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });

interface ReportPageProps {
  title: string;
  subtitle?: string;
  generatedBy: string;
  children: React.ReactNode;
}

// Documento carta con encabezado y pie en cada página.
export function ReportDocument({ title, subtitle, generatedBy, children }: ReportPageProps) {
  const generatedAt = pdfDateTime(new Date());
  return (
    <Document title={`${title} · ${STORE_INFO.name}`} author={STORE_INFO.name}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.brand}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image style={styles.logo} src={`${window.location.origin}${STORE_INFO.logoPath}`} />
            <View>
              <Text style={styles.storeName}>{STORE_INFO.name}</Text>
              <Text style={styles.storeLine}>{STORE_INFO.addressLine1}</Text>
              <Text style={styles.storeLine}>{STORE_INFO.addressLine2}</Text>
              <Text style={styles.storeLine}>
                Tel. {STORE_INFO.phone} · {STORE_INFO.email}
              </Text>
            </View>
          </View>
          <View style={styles.titleBox}>
            <Text style={styles.title}>{title.toUpperCase()}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>

        {children}

        <View style={styles.footer} fixed>
          <Text>
            Generado el {generatedAt} por {generatedBy}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

// Columna de tabla: ancho relativo y alineación.
export type Column = { label: string; flex: number; align?: "left" | "center" | "right" };

export function TableHeader({ columns }: { columns: Column[] }) {
  return (
    <View style={styles.tableHeader} fixed>
      {columns.map((c) => (
        <Text key={c.label} style={{ flex: c.flex, textAlign: c.align ?? "left" }}>
          {c.label}
        </Text>
      ))}
    </View>
  );
}

export function TableRow({
  columns,
  cells,
  bold,
  muted,
}: {
  columns: Column[];
  cells: React.ReactNode[];
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <View style={[styles.tableRow, bold ? styles.bold : {}, muted ? styles.muted : {}]} wrap={false}>
      {cells.map((cell, i) => (
        <Text key={i} style={{ flex: columns[i].flex, textAlign: columns[i].align ?? "left", paddingRight: 4 }}>
          {cell}
        </Text>
      ))}
    </View>
  );
}

export function SummaryBoxes({ items }: { items: { label: string; value: string; hint?: string }[] }) {
  return (
    <View style={styles.summaryRow}>
      {items.map((item) => (
        <View key={item.label} style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>{item.label}</Text>
          <Text style={styles.summaryValue}>{item.value}</Text>
          {item.hint && <Text style={styles.summaryHint}>{item.hint}</Text>}
        </View>
      ))}
    </View>
  );
}

export function SignatureLines({ labels }: { labels: string[] }) {
  return (
    <View style={styles.signatures} wrap={false}>
      {labels.map((label) => (
        <Text key={label} style={styles.signature}>
          {label}
        </Text>
      ))}
    </View>
  );
}

// Genera el PDF y lo descarga con `filename`. En celular lo abre en una
// pestaña nueva: el navegador del celular lo mostraba encima del panel y
// había que regresar para seguir. Si el navegador bloquea la pestaña nueva,
// se descarga como en computadora.
export async function downloadPdf(document: React.ReactElement, filename: string) {
  // @react-pdf espera un <Document>; ReportDocument lo regresa.
  const blob = await pdf(document as Parameters<typeof pdf>[0]).toBlob();
  const url = URL.createObjectURL(blob);
  const isMobile = window.matchMedia("(pointer: coarse)").matches;
  const opened = isMobile ? window.open(url, "_blank") : null;
  if (!opened) {
    const a = window.document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }
  // La pestaña nueva necesita el enlace mientras carga; un minuto basta.
  setTimeout(() => URL.revokeObjectURL(url), opened ? 60_000 : 1000);
}

// Nombre de quien genera el reporte (para el pie). Si falla, "la tienda".
export async function currentUserName(): Promise<string> {
  try {
    const res = await fetch("/api/me");
    if (!res.ok) return STORE_INFO.name;
    const me: { name?: string } = await res.json();
    return me.name?.trim() || STORE_INFO.name;
  } catch {
    return STORE_INFO.name;
  }
}

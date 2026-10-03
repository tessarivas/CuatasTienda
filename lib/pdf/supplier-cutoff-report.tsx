// Reporte PDF del corte de un proveedor (mensual o por rango). Sirve como
// comprobante de lo que se le entrega: incluye líneas de firma.
import { Text, View } from "@react-pdf/renderer";
import {
  type Column,
  ReportDocument,
  SignatureLines,
  SummaryBoxes,
  TableHeader,
  TableRow,
  currentUserName,
  downloadPdf,
  pdfDate,
  pdfDateTime,
  pdfMoney,
  styles,
} from "./report-layout";

export type SupplierCutoffReportData = {
  supplierName: string;
  cutoffDay: number;
  isCurrentPeriod: boolean;
  period: { from: string; to: string };
  totalSold: string;
  unitsSold: number;
  salesCount: number;
  availableProducts: number;
  products: { title: string; units: number; total: string }[];
  sales: {
    folio: string | null;
    date: string;
    lines: { title: string; quantity: number; total: string }[];
    discount: string;
    total: string;
  }[];
};

const PRODUCT_COLUMNS: Column[] = [
  { label: "Producto", flex: 6 },
  { label: "Piezas", flex: 1.2, align: "center" },
  { label: "Total", flex: 1.8, align: "right" },
];

const SALE_COLUMNS: Column[] = [
  { label: "Folio", flex: 1.6 },
  { label: "Fecha", flex: 1.8 },
  { label: "Productos", flex: 5 },
  { label: "Total", flex: 1.6, align: "right" },
];

export function SupplierCutoffDocument({
  data,
  generatedBy,
}: {
  data: SupplierCutoffReportData;
  generatedBy: string;
}) {
  const range = `Del ${pdfDate(data.period.from)} al ${pdfDate(data.period.to)}`;
  return (
    <ReportDocument
      title="Corte de proveedor"
      subtitle={`${data.supplierName}\n${range}`}
      generatedBy={generatedBy}
    >
      <Text style={[styles.muted, { marginBottom: 10 }]}>
        {data.isCurrentPeriod
          ? `Periodo de corte (día ${data.cutoffDay} de cada mes).`
          : `Rango elegido. Su día de corte es el ${data.cutoffDay} de cada mes.`}
      </Text>

      <SummaryBoxes
        items={[
          {
            label: "Total vendido",
            value: pdfMoney(Number(data.totalSold)),
            hint: "Ganancia del proveedor en el periodo",
          },
          {
            label: "Piezas vendidas",
            value: String(data.unitsSold),
            hint: `En ${data.salesCount} ${data.salesCount === 1 ? "venta" : "ventas"}`,
          },
          {
            label: "Productos disponibles",
            value: String(data.availableProducts),
            hint: "Con unidades libres al generar el reporte",
          },
        ]}
      />

      <Text style={styles.sectionTitle}>Ventas por producto</Text>
      {data.products.length === 0 ? (
        <Text style={styles.muted}>No hubo ventas en este periodo.</Text>
      ) : (
        <View>
          <TableHeader columns={PRODUCT_COLUMNS} />
          {data.products.map((p) => (
            <TableRow
              key={p.title}
              columns={PRODUCT_COLUMNS}
              cells={[p.title, String(p.units), pdfMoney(Number(p.total))]}
            />
          ))}
          <TableRow
            bold
            columns={PRODUCT_COLUMNS}
            cells={["Total", String(data.unitsSold), pdfMoney(Number(data.totalSold))]}
          />
        </View>
      )}

      {data.sales.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Detalle de ventas</Text>
          <TableHeader columns={SALE_COLUMNS} />
          {data.sales.map((s, i) => (
            <TableRow
              key={`${s.folio}-${i}`}
              columns={SALE_COLUMNS}
              cells={[
                s.folio ?? "Sin folio",
                pdfDateTime(s.date),
                s.lines.map((l) => `${l.quantity}x ${l.title}`).join(", ") +
                  (Number(s.discount) > 0
                    ? ` (descuento al total ${pdfMoney(-Number(s.discount))})`
                    : ""),
                pdfMoney(Number(s.total)),
              ]}
            />
          ))}
        </>
      )}

      <SignatureLines labels={["Entregó (Cuatas Tienda)", `Recibió (${data.supplierName})`]} />
    </ReportDocument>
  );
}

export async function exportSupplierCutoffPdf(data: SupplierCutoffReportData) {
  const generatedBy = await currentUserName();
  const safeName = data.supplierName.replace(/[^\p{L}\p{N}]+/gu, "_");
  await downloadPdf(
    <SupplierCutoffDocument data={data} generatedBy={generatedBy} />,
    `Corte_${safeName}_${data.period.from}_al_${data.period.to}.pdf`
  );
}

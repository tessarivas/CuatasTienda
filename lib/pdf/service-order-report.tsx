// Nota de servicio en hoja carta (pedido de servicio): como una nota de venta
// sencilla, con el encabezado de la tienda de todos los reportes, los datos
// del cliente, la tabla Cant. / Descripción / P. unit. / Importe, el total,
// quién la expidió y firma de conformidad del cliente.
import { Text, View } from "@react-pdf/renderer";
import {
  type Column,
  ReportDocument,
  SignatureLines,
  TableHeader,
  TableRow,
  currentUserName,
  downloadPdf,
  pdfDateTime,
  pdfMoney,
  styles,
} from "./report-layout";

export type ServiceOrderPdfData = {
  folio: string;
  createdAt: string;
  customerName: string;
  customerPhone: string | null;
  status: "PorEntregar" | "Entregado" | "Cancelado";
  supplierName: string;
  createdBy: string;
  items: { description: string; quantity: number; price: number }[];
  sale: { folio: string | null; date: string; paymentMethod: string | null } | null;
  payments: { date: string; amount: number; method: string; kind: "Abono" | "Devolucion" }[];
  deliveredAt: string | null;
};

const COLUMNS: Column[] = [
  { label: "Cant.", flex: 1, align: "center" },
  { label: "Descripción", flex: 6 },
  { label: "P. unit.", flex: 1.6, align: "right" },
  { label: "Importe", flex: 1.8, align: "right" },
];

const STATUS_TEXT = {
  PorEntregar: "Por entregar.",
  Entregado: "Entregado.",
  Cancelado: "Cancelado.",
} as const;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 4 }}>
      <Text style={[styles.bold, { width: 70 }]}>{label}</Text>
      <Text style={{ flex: 1 }}>{value}</Text>
    </View>
  );
}

export function ServiceOrderDocument({
  data,
  generatedBy,
}: {
  data: ServiceOrderPdfData;
  generatedBy: string;
}) {
  const total = data.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const paid = data.payments.reduce((sum, p) => sum + (p.kind === "Devolucion" ? -p.amount : p.amount), 0);
  const rest = Math.max(0, total - paid);
  return (
    <ReportDocument
      title="Nota de servicio"
      subtitle={`Folio ${data.folio}\n${pdfDateTime(data.createdAt)}`}
      generatedBy={generatedBy}
    >
      <View
        style={{ borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 4, padding: 10, marginBottom: 6 }}
      >
        <Field label="Cliente" value={data.customerName} />
        <Field label="Teléfono" value={data.customerPhone ?? ""} />
        <Field label="Servicio de" value={data.supplierName} />
      </View>

      <Text style={styles.sectionTitle}>Servicios</Text>
      <TableHeader columns={COLUMNS} />
      {data.items.map((i, idx) => (
        <TableRow
          key={idx}
          columns={COLUMNS}
          cells={[String(i.quantity), i.description, pdfMoney(i.price), pdfMoney(i.price * i.quantity)]}
        />
      ))}
      <TableRow bold columns={COLUMNS} cells={["", "TOTAL", "", pdfMoney(total)]} />
      {data.payments.map((p, idx) => (
        <TableRow
          key={`p-${idx}`}
          columns={COLUMNS}
          cells={[
            "",
            `${p.kind === "Devolucion" ? "Devolución" : "Pago"} ${pdfDateTime(p.date)} (${p.method})`,
            "",
            pdfMoney(p.kind === "Devolucion" ? p.amount : -p.amount),
          ]}
        />
      ))}
      {data.status !== "Cancelado" && data.payments.length > 0 && (
        <TableRow bold columns={COLUMNS} cells={["", "RESTA POR PAGAR", "", pdfMoney(rest)]} />
      )}

      <Text style={[styles.muted, { marginTop: 10 }]}>
        {STATUS_TEXT[data.status]}
        {data.status === "PorEntregar" ? (rest > 0 ? " El cliente paga lo que resta al recoger." : " Ya está pagado.") : ""}
        {data.sale?.folio ? ` Folio de venta ${data.sale.folio}.` : ""}
      </Text>

      <SignatureLines labels={[`Expedida por ${data.createdBy}`, "Firma del cliente"]} />
    </ReportDocument>
  );
}

export async function exportServiceOrderPdf(data: ServiceOrderPdfData) {
  const generatedBy = await currentUserName();
  await downloadPdf(
    <ServiceOrderDocument data={data} generatedBy={generatedBy} />,
    `Nota_${data.folio}.pdf`
  );
}

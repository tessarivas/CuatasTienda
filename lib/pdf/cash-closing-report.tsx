// Reporte PDF del corte de caja de un día: efectivo (caja principal y caja de
// apartados), cobros con tarjeta/transferencia y si tienen comprobante.
// Se arma con lo que se ve en pantalla, así que también sirve para un corte
// abierto (antes de cerrarlo) o para imprimir una corrección.
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

export type CashClosingReportData = {
  date: string; // YYYY-MM-DD
  closing: { closedBy: string; closedAt: string; correctedAt: string | null } | null;
  periodStart: string | null;
  periodEnd: string | null;
  openingCash: number;
  cashSales: number;
  expectedCash: number;
  countedCash: number | null; // null = todavía sin contar
  cashPayments: number;
  bankTotal: number;
  notes: string;
  sales: { folio: string | null; date: string; method: string; total: number; hasReceipt: boolean }[];
  // amount negativo e isRefund = devolución de saldo al cliente (sin comprobante).
  payments: { client: string; date: string; method: string; amount: number; hasReceipt: boolean; isRefund?: boolean }[];
};

const SALE_COLUMNS: Column[] = [
  { label: "Folio", flex: 2 },
  { label: "Fecha y hora", flex: 2.2 },
  { label: "Método", flex: 2 },
  { label: "Comprobante", flex: 1.8, align: "center" },
  { label: "Total", flex: 1.6, align: "right" },
];

const PAYMENT_COLUMNS: Column[] = [
  { label: "Cliente", flex: 3 },
  { label: "Fecha y hora", flex: 2.2 },
  { label: "Método", flex: 2 },
  { label: "Comprobante", flex: 1.8, align: "center" },
  { label: "Monto", flex: 1.6, align: "right" },
];

// Comprobante sólo aplica a tarjeta y transferencia.
const receiptCell = (method: string, hasReceipt: boolean, isRefund = false) =>
  method === "Efectivo" || isRefund ? "" : hasReceipt ? "Adjunto" : "Pendiente";

function CashLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View
      style={[
        { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
        bold ? styles.bold : {},
      ]}
    >
      <Text>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

export function CashClosingDocument({
  data,
  generatedBy,
}: {
  data: CashClosingReportData;
  generatedBy: string;
}) {
  const difference = data.countedCash === null ? null : data.countedCash - data.expectedCash;
  const status = data.closing
    ? `Cerrado por ${data.closing.closedBy} el ${pdfDateTime(data.closing.closedAt)}` +
      (data.closing.correctedAt ? `\nCorregido el ${pdfDateTime(data.closing.correctedAt)}` : "")
    : "Corte abierto, sin cerrar";
  const pending =
    data.sales.filter((s) => s.method !== "Efectivo" && !s.hasReceipt).length +
    data.payments.filter((p) => p.method !== "Efectivo" && !p.isRefund && !p.hasReceipt).length;

  return (
    <ReportDocument
      title="Corte de caja"
      subtitle={`${pdfDate(data.date)}\n${status}`}
      generatedBy={generatedBy}
    >
      {data.periodStart && (
        <Text style={[styles.muted, { marginBottom: 10 }]}>
          Cobros del {pdfDateTime(data.periodStart)}
          {data.periodEnd ? ` al ${pdfDateTime(data.periodEnd)}` : " a la fecha"}
        </Text>
      )}

      <SummaryBoxes
        items={[
          {
            label: "Total cobrado",
            value: pdfMoney(data.cashSales + data.cashPayments + data.bankTotal),
            hint: "Ventas de caja y abonos",
          },
          {
            label: "Efectivo esperado",
            value: pdfMoney(data.expectedCash),
            hint: "Caja principal, con el fondo inicial",
          },
          { label: "Banco", value: pdfMoney(data.bankTotal), hint: "Tarjeta y transferencia" },
        ]}
      />

      <View style={{ flexDirection: "row", gap: 24 }} wrap={false}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Caja principal</Text>
          <CashLine label="Fondo inicial" value={pdfMoney(data.openingCash)} />
          <CashLine label="+ Ventas en efectivo" value={pdfMoney(data.cashSales)} />
          <View style={{ borderTopWidth: 1, borderTopColor: "#1c1917", marginTop: 2 }}>
            <CashLine label="Esperado en caja" value={pdfMoney(data.expectedCash)} bold />
          </View>
          <CashLine
            label="Contado"
            value={data.countedCash === null ? "Sin contar" : pdfMoney(data.countedCash)}
          />
          {difference !== null && (
            <CashLine
              label="Diferencia"
              value={`${difference > 0 ? "+" : ""}${pdfMoney(difference)} ${
                difference < 0 ? "(faltante)" : difference > 0 ? "(sobrante)" : "(cuadra)"
              }`}
              bold
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Caja de apartados</Text>
          <CashLine label="Abonos en efectivo" value={pdfMoney(data.cashPayments)} bold />
          <Text style={[styles.muted, { fontSize: 8, marginTop: 2 }]}>
            Se guardan aparte, no en la caja principal.
          </Text>
          {data.notes.trim() && (
            <>
              <Text style={styles.sectionTitle}>Notas</Text>
              <Text>{data.notes.trim()}</Text>
            </>
          )}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Ventas de caja</Text>
      {data.sales.length === 0 ? (
        <Text style={styles.muted}>No hubo ventas en este corte.</Text>
      ) : (
        <View>
          <TableHeader columns={SALE_COLUMNS} />
          {data.sales.map((s, i) => (
            <TableRow
              key={`${s.folio}-${i}`}
              columns={SALE_COLUMNS}
              cells={[
                s.folio ?? "Sin folio",
                pdfDateTime(s.date),
                s.method,
                receiptCell(s.method, s.hasReceipt),
                pdfMoney(s.total),
              ]}
            />
          ))}
          <TableRow
            bold
            columns={SALE_COLUMNS}
            cells={["Total", "", "", "", pdfMoney(data.sales.reduce((sum, s) => sum + s.total, 0))]}
          />
        </View>
      )}

      <Text style={styles.sectionTitle}>Abonos de clientes</Text>
      {data.payments.length === 0 ? (
        <Text style={styles.muted}>No hubo abonos en este corte.</Text>
      ) : (
        <View>
          <TableHeader columns={PAYMENT_COLUMNS} />
          {data.payments.map((p, i) => (
            <TableRow
              key={i}
              columns={PAYMENT_COLUMNS}
              cells={[
                p.client,
                pdfDateTime(p.date),
                p.method,
                receiptCell(p.method, p.hasReceipt, p.isRefund),
                pdfMoney(p.amount),
              ]}
            />
          ))}
          <TableRow
            bold
            columns={PAYMENT_COLUMNS}
            cells={["Total", "", "", "", pdfMoney(data.payments.reduce((sum, p) => sum + p.amount, 0))]}
          />
        </View>
      )}

      {pending > 0 && (
        <Text style={[styles.muted, { marginTop: 8 }]}>
          {pending} {pending === 1 ? "comprobante pendiente" : "comprobantes pendientes"} de adjuntar.
        </Text>
      )}

      <SignatureLines labels={["Entregó", "Recibió"]} />
    </ReportDocument>
  );
}

export async function exportCashClosingPdf(data: CashClosingReportData) {
  const generatedBy = await currentUserName();
  await downloadPdf(
    <CashClosingDocument data={data} generatedBy={generatedBy} />,
    `Corte_de_caja_${data.date}.pdf`
  );
}

// Reporte PDF del estado de cuenta de un cliente: sus apartados vigentes,
// cuánto lleva abonado, cuánto le falta, y la lista completa de movimientos
// (el mismo cuaderno de la pantalla, del más antiguo al más reciente).
import { Text, View } from "@react-pdf/renderer";
import {
  type Column,
  ReportDocument,
  SummaryBoxes,
  TableHeader,
  TableRow,
  currentUserName,
  downloadPdf,
  pdfDateTime,
  pdfMoney,
  styles,
} from "./report-layout";

export type ClientStatementData = {
  clientName: string;
  phone: string;
  reserved: { title: string; units: number; total: number }[];
  reservedTotal: number;
  balance: number;
  // Movimientos del más antiguo al más reciente. Un cargo es un apartado (o
  // una liquidación de antes del historial); "nota" es un renglón que no
  // mueve la cuenta (apartado cancelado o venta de un apartado ya anotado).
  movements: { date: string; label: string; kind: "cargo" | "abono" | "nota"; amount: number }[];
};

const RESERVED_COLUMNS: Column[] = [
  { label: "Producto", flex: 6 },
  { label: "Piezas", flex: 1.2, align: "center" },
  { label: "Total", flex: 1.8, align: "right" },
];

const MOVEMENT_COLUMNS: Column[] = [
  { label: "Fecha", flex: 2 },
  { label: "Movimiento", flex: 5.5 },
  { label: "Cargo", flex: 1.5, align: "right" },
  { label: "Abono", flex: 1.5, align: "right" },
];

export function ClientStatementDocument({
  data,
  generatedBy,
}: {
  data: ClientStatementData;
  generatedBy: string;
}) {
  const falta = Math.max(0, data.reservedTotal - data.balance);
  const sobran = Math.max(0, data.balance - data.reservedTotal);

  return (
    <ReportDocument
      title="Estado de cuenta"
      subtitle={data.phone ? `${data.clientName}\nTel. ${data.phone}` : data.clientName}
      generatedBy={generatedBy}
    >
      <SummaryBoxes
        items={[
          { label: "Total apartado", value: pdfMoney(data.reservedTotal), hint: "Apartados vigentes" },
          { label: "Abonado", value: pdfMoney(data.balance), hint: "Saldo a favor" },
          sobran > 0
            ? { label: "Le sobran", value: pdfMoney(sobran), hint: "Abonó más de lo apartado" }
            : { label: "Falta por pagar", value: pdfMoney(falta) },
        ]}
      />

      <Text style={styles.sectionTitle}>Apartados vigentes</Text>
      {data.reserved.length === 0 ? (
        <Text style={styles.muted}>No tiene productos apartados.</Text>
      ) : (
        <View>
          <TableHeader columns={RESERVED_COLUMNS} />
          {data.reserved.map((r) => (
            <TableRow
              key={r.title}
              columns={RESERVED_COLUMNS}
              cells={[r.title, String(r.units), pdfMoney(r.total)]}
            />
          ))}
          <TableRow
            bold
            columns={RESERVED_COLUMNS}
            cells={[
              "Total",
              String(data.reserved.reduce((sum, r) => sum + r.units, 0)),
              pdfMoney(data.reservedTotal),
            ]}
          />
        </View>
      )}

      <Text style={styles.sectionTitle}>Historial de movimientos</Text>
      {data.movements.length === 0 ? (
        <Text style={styles.muted}>No hay movimientos registrados.</Text>
      ) : (
        <View>
          <TableHeader columns={MOVEMENT_COLUMNS} />
          {data.movements.map((m, i) => (
            <TableRow
              key={i}
              muted={m.kind === "nota"}
              columns={MOVEMENT_COLUMNS}
              cells={[
                pdfDateTime(m.date),
                m.kind === "nota" ? `${m.label} (${pdfMoney(m.amount)})` : m.label,
                m.kind === "cargo" ? pdfMoney(m.amount) : "",
                m.kind === "abono" ? pdfMoney(m.amount) : "",
              ]}
            />
          ))}
        </View>
      )}
    </ReportDocument>
  );
}

export async function exportClientStatementPdf(data: ClientStatementData) {
  const generatedBy = await currentUserName();
  const safeName = data.clientName.replace(/[^\p{L}\p{N}]+/gu, "_");
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
  await downloadPdf(
    <ClientStatementDocument data={data} generatedBy={generatedBy} />,
    `Estado_de_cuenta_${safeName}_${today}.pdf`
  );
}

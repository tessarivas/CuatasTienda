// Reporte PDF del historial de ventas de un periodo. Lleva exactamente las
// ventas que muestra la tabla (con los filtros aplicados), y el resumen se
// calcula sobre esas mismas ventas para que los totales cuadren con la lista.
import { Text, View } from "@react-pdf/renderer";
import {
  type Column,
  ReportDocument,
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

export type SalesHistoryReportData = {
  periodLabel: string; // "Hoy", "Esta semana", "Rango personalizado"...
  from: string; // YYYY-MM-DD, ambos inclusive
  to: string;
  filters: string[]; // filtros activos, en palabras
  sales: {
    folio: string | null;
    date: string;
    origin: string; // "Caja" o el nombre del cliente
    products: string;
    method: string; // Efectivo, Tarjeta, Transferencia o Saldo
    total: number;
  }[];
};

const COLUMNS: Column[] = [
  { label: "Folio", flex: 1.6 },
  { label: "Fecha y hora", flex: 2.5 },
  { label: "Origen", flex: 1.9 },
  { label: "Productos", flex: 4.2 },
  { label: "Método", flex: 1.7 },
  { label: "Total", flex: 1.5, align: "right" },
];

export function SalesHistoryDocument({
  data,
  generatedBy,
}: {
  data: SalesHistoryReportData;
  generatedBy: string;
}) {
  const range =
    data.from === data.to ? pdfDate(data.from) : `Del ${pdfDate(data.from)} al ${pdfDate(data.to)}`;
  const total = data.sales.reduce((sum, s) => sum + s.total, 0);
  const by = { efectivo: 0, banco: 0, saldo: 0 };
  for (const s of data.sales) {
    if (s.method === "Efectivo") by.efectivo += s.total;
    else if (s.method === "Saldo") by.saldo += s.total;
    else by.banco += s.total;
  }

  return (
    <ReportDocument
      title="Historial de ventas"
      subtitle={`${data.periodLabel}\n${range}`}
      generatedBy={generatedBy}
    >
      {data.filters.length > 0 && (
        <Text style={[styles.muted, { marginBottom: 10 }]}>
          Filtros: {data.filters.join(" · ")}.
        </Text>
      )}

      <SummaryBoxes
        items={[
          {
            label: "Ventas",
            value: String(data.sales.length),
            hint: "Caja y apartados liquidados",
          },
          { label: "Total vendido", value: pdfMoney(total) },
        ]}
      />
      <SummaryBoxes
        items={[
          { label: "Efectivo", value: pdfMoney(by.efectivo), hint: "En caja" },
          { label: "Banco", value: pdfMoney(by.banco), hint: "Tarjeta y transferencia" },
          { label: "Apartados", value: pdfMoney(by.saldo), hint: "Liquidados con saldo" },
        ]}
      />

      <Text style={styles.sectionTitle}>Ventas</Text>
      {data.sales.length === 0 ? (
        <Text style={styles.muted}>No hay ventas en este periodo.</Text>
      ) : (
        <View>
          <TableHeader columns={COLUMNS} />
          {data.sales.map((s, i) => (
            <TableRow
              key={`${s.folio}-${i}`}
              columns={COLUMNS}
              cells={[
                s.folio ?? "Sin folio",
                pdfDateTime(s.date),
                s.origin,
                s.products,
                s.method,
                pdfMoney(s.total),
              ]}
            />
          ))}
          <TableRow
            bold
            columns={COLUMNS}
            cells={["Total", "", "", "", "", pdfMoney(total)]}
          />
        </View>
      )}
    </ReportDocument>
  );
}

export async function exportSalesHistoryPdf(data: SalesHistoryReportData) {
  const generatedBy = await currentUserName();
  const name =
    data.from === data.to ? `Ventas_${data.from}` : `Ventas_${data.from}_al_${data.to}`;
  await downloadPdf(<SalesHistoryDocument data={data} generatedBy={generatedBy} />, `${name}.pdf`);
}

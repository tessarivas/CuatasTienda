// Reporte PDF de existencias de un proveedor: qué tiene en tienda y en qué
// estado, más lo vendido en el periodo. Reglas en
// app/api/suppliers/[id]/stock-report/route.ts.
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
  pdfMoney,
  styles,
} from "./report-layout";

export type SupplierStockReportData = {
  supplierName: string;
  cutoffDay: number;
  isCurrentPeriod: boolean;
  period: { from: string; to: string };
  products: {
    title: string;
    code: string | null;
    price: number;
    status: string; // Disponible | Apartado | Vendido | Retirado
    quantity: number;
    reserved: number;
    available: number;
    soldUnits: number;
    soldTotal: number;
  }[];
};

const COLUMNS: Column[] = [
  { label: "Producto", flex: 4.4 },
  { label: "Código", flex: 1.8 },
  { label: "Precio", flex: 1.4, align: "right" },
  { label: "Existencia", flex: 1.4, align: "center" },
  { label: "Apartadas", flex: 1.4, align: "center" },
  { label: "Disponibles", flex: 1.5, align: "center" },
  { label: "Vendidas", flex: 1.3, align: "center" },
  { label: "Estado", flex: 1.6 },
];

export function SupplierStockDocument({
  data,
  generatedBy,
}: {
  data: SupplierStockReportData;
  generatedBy: string;
}) {
  const range = `Del ${pdfDate(data.period.from)} al ${pdfDate(data.period.to)}`;
  // Los retirados salen en la tabla, pero no cuentan como mercancía en tienda.
  const inStore = data.products.filter((p) => p.status !== "Retirado");
  const sum = (list: typeof data.products, pick: (p: (typeof data.products)[number]) => number) =>
    list.reduce((total, p) => total + pick(p), 0);
  const pieces = sum(inStore, (p) => p.quantity);
  const reserved = sum(inStore, (p) => p.reserved);
  const soldUnits = sum(data.products, (p) => p.soldUnits);
  const soldTotal = sum(data.products, (p) => p.soldTotal);

  return (
    <ReportDocument
      title="Existencias del proveedor"
      subtitle={`${data.supplierName}\n${range}`}
      generatedBy={generatedBy}
    >
      <Text style={[styles.muted, { marginBottom: 10 }]}>
        Existencias al generar el reporte. Las ventas son sólo las de este periodo
        {data.isCurrentPeriod ? ` (corte del día ${data.cutoffDay} de cada mes)` : ""}; las de
        cortes anteriores ya se entregaron.
      </Text>

      <SummaryBoxes
        items={[
          {
            label: "Piezas en tienda",
            value: String(pieces),
            hint: `${inStore.length} ${inStore.length === 1 ? "producto" : "productos"}`,
          },
          {
            label: "Disponibles",
            value: String(pieces - reserved),
            hint: `${reserved} ${reserved === 1 ? "apartada" : "apartadas"}`,
          },
          {
            label: "Vendidas en el periodo",
            value: String(soldUnits),
            hint: pdfMoney(soldTotal),
          },
        ]}
      />

      <Text style={styles.sectionTitle}>Productos</Text>
      {data.products.length === 0 ? (
        <Text style={styles.muted}>No hay productos con existencia ni ventas en este periodo.</Text>
      ) : (
        <View>
          <TableHeader columns={COLUMNS} />
          {data.products.map((p, i) => (
            <TableRow
              key={`${p.code}-${i}`}
              muted={p.status === "Retirado"}
              columns={COLUMNS}
              cells={[
                p.title,
                p.code ?? "",
                pdfMoney(p.price),
                String(p.quantity),
                String(p.reserved),
                String(p.available),
                String(p.soldUnits),
                p.status,
              ]}
            />
          ))}
          <TableRow
            bold
            columns={COLUMNS}
            cells={[
              "Total en tienda",
              "",
              "",
              String(pieces),
              String(reserved),
              String(pieces - reserved),
              String(soldUnits),
              "",
            ]}
          />
        </View>
      )}
      <Text style={[styles.muted, { marginTop: 8, fontSize: 8 }]}>
        Los productos retirados aparecen en gris y no cuentan en las piezas en tienda ni en el total.
      </Text>
    </ReportDocument>
  );
}

export async function exportSupplierStockPdf(data: SupplierStockReportData) {
  const generatedBy = await currentUserName();
  const safeName = data.supplierName.replace(/[^\p{L}\p{N}]+/gu, "_");
  await downloadPdf(
    <SupplierStockDocument data={data} generatedBy={generatedBy} />,
    `Existencias_${safeName}_${data.period.from}_al_${data.period.to}.pdf`
  );
}

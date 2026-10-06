"use client";

// Tickets para la impresora térmica de 58 mm (EC-PM-58110). El mismo
// componente es la vista previa en los modales y lo que se imprime
// (lib/print-ticket.ts), así que se ve igual en pantalla y en papel.
//
// Va en blanco y negro a propósito (bg-white / text-black, no los tokens
// de la app): es papel térmico, sin colores ni modo oscuro. El ancho útil
// de la impresora es de 48 mm.
import * as React from "react";
import { STORE_INFO } from "@/lib/store-info";
import { cn } from "@/lib/utils";

const money = (amount: number) =>
  `${amount < 0 ? "-" : ""}$${Math.abs(amount).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const ticketDate = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });

function Divider() {
  return <div className="my-2 border-t border-dashed border-black" />;
}

function Row({
  label,
  value,
  bold,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-between gap-2", bold && "font-bold", className)}>
      <span className="min-w-0">{label}</span>
      <span className="shrink-0 tabular-nums">{value}</span>
    </div>
  );
}

// Papel del ticket: 58 mm con 5 mm de margen a cada lado (48 mm útiles),
// encabezado con logo y datos de la tienda, y el agradecimiento al pie.
const TicketPaper = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; thanks: string }
>(function TicketPaper({ children, thanks }, ref) {
  return (
    <div
      ref={ref}
      className="w-[58mm] bg-white px-[5mm] py-[4mm] text-[11px] leading-snug text-black"
    >
      <div className="flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={STORE_INFO.logoPath}
          alt=""
          className="mb-1 h-[12mm] w-auto grayscale"
        />
        <p className="text-[13px] font-bold">{STORE_INFO.name}</p>
        <p>{STORE_INFO.addressLine1}</p>
        <p>{STORE_INFO.addressLine2}</p>
        <p>Tel. {STORE_INFO.phone}</p>
      </div>
      <Divider />
      {children}
      <Divider />
      <p className="text-center font-bold">{thanks}</p>
    </div>
  );
});

// --- Venta (caja o liquidación de apartado) ---

export type TicketSale = {
  id: number;
  folio: string | null;
  date: string;
  total: string;
  discount: string;
  paymentMethod: "Efectivo" | "Tarjeta" | "Transferencia" | null;
  Client: { name: string } | null;
  User: { name: string };
  SaleItem: {
    id: number;
    quantity: number;
    finalPrice: string;
    discount: string;
    Product: { title: string; Supplier?: { businessName: string | null } | null };
  }[];
};

export const SaleTicket = React.forwardRef<
  HTMLDivElement,
  // showSuppliers: sólo para la vista previa del Historial de Ventas; se
  // quita al imprimir (data-print-hide).
  { sale: TicketSale; showSuppliers?: boolean }
>(function SaleTicket({ sale, showSuppliers }, ref) {
  const lines = sale.SaleItem.map((item) => {
    const unit = Number(item.finalPrice);
    const discount = Number(item.discount);
    return { ...item, unit, discountValue: discount, total: unit * item.quantity - discount };
  });
  const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
  const ticketDiscount = Number(sale.discount);
  const isLiquidation = sale.paymentMethod === null;

  return (
    <TicketPaper ref={ref} thanks="¡Gracias por su compra!">
      <Row label="Folio" value={sale.folio ?? `#${sale.id}`} bold />
      <p>{ticketDate(sale.date)}</p>
      <p>Atendió: {sale.User.name}</p>
      {sale.Client && <p>Cliente: {sale.Client.name}</p>}
      {isLiquidation && <p className="font-bold">Liquidación de apartado</p>}
      <Divider />

      <div className="space-y-1.5">
        {lines.map((l) => (
          <div key={l.id}>
            <p className="wrap-break-word">
              {l.quantity} x {l.Product.title}
              {showSuppliers && l.Product.Supplier?.businessName && (
                <span data-print-hide className="text-muted-foreground">
                  {" "}
                  · {l.Product.Supplier.businessName}
                </span>
              )}
            </p>
            <Row label={`${money(l.unit)} c/u`} value={money(l.unit * l.quantity)} className="pl-2" />
            {l.discountValue > 0 && (
              <Row label="Descuento" value={money(-l.discountValue)} className="pl-2" />
            )}
          </div>
        ))}
      </div>

      <Divider />
      {ticketDiscount > 0 && (
        <>
          <Row label="Subtotal" value={money(subtotal)} />
          <Row label="Descuento al total" value={money(-ticketDiscount)} />
        </>
      )}
      <Row label="TOTAL" value={money(Number(sale.total))} bold className="text-[13px]" />
      <Row
        label="Pago"
        value={isLiquidation ? "Saldo del cliente" : sale.paymentMethod}
      />
    </TicketPaper>
  );
});

// --- Abono de un cliente ---

export type TicketPayment = {
  id: number;
  date: string;
  amount: number;
  method: string;
  receivedBy: string | null;
  clientName: string;
  // Estado de la cuenta al imprimir (no al momento del abono).
  account: { reservedTotal: number; balance: number };
  printedAt: string;
};

export const PaymentTicket = React.forwardRef<HTMLDivElement, { payment: TicketPayment }>(
  function PaymentTicket({ payment }, ref) {
    const { reservedTotal, balance } = payment.account;
    const falta = Math.max(0, reservedTotal - balance);
    const sobran = Math.max(0, balance - reservedTotal);
    return (
      <TicketPaper ref={ref} thanks="¡Gracias por su abono!">
        <p className="text-center font-bold">COMPROBANTE DE ABONO</p>
        <Divider />
        <p>{ticketDate(payment.date)}</p>
        {payment.receivedBy && <p>Atendió: {payment.receivedBy}</p>}
        <p>Cliente: {payment.clientName}</p>
        <Divider />
        <Row label="ABONO" value={money(payment.amount)} bold className="text-[13px]" />
        <Row label="Pago" value={payment.method} />
        <Divider />
        <p className="mb-1">Cuenta al {ticketDate(payment.printedAt)}</p>
        <Row label="Total apartado" value={money(reservedTotal)} />
        <Row label="Abonado" value={money(balance)} />
        {sobran > 0 ? (
          <Row label="Le sobran" value={money(sobran)} bold />
        ) : (
          <Row label="Falta por pagar" value={money(falta)} bold />
        )}
      </TicketPaper>
    );
  }
);

// Marco para la vista previa en un modal: el papel sobre un fondo gris, con
// sombra, como si saliera de la impresora. Scroll si el ticket es largo.
export function TicketPreview({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex max-h-[55vh] justify-center overflow-y-auto rounded-lg bg-muted p-4">
      <div className="h-fit shadow-md">{children}</div>
    </div>
  );
}

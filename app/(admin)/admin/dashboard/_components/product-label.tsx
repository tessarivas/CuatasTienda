"use client";

// Etiqueta de un producto (#35): código de barras real (Code 128, el que
// leen los lectores de la caja), el número del código, y proveedor y precio. Por ahora sólo se muestra en el detalle del producto; el mismo
// componente servirá para exportar/imprimir etiquetas más adelante.
//
// Blanco y negro a propósito (como la etiqueta impresa), no los tokens de
// la app.
import * as React from "react";
import JsBarcode from "jsbarcode";
import { cn } from "@/lib/utils";

interface ProductLabelProps {
  code: string;
  supplierName: string;
  price: number;
  className?: string;
}

export function ProductLabel({ code, supplierName, price, className }: ProductLabelProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      JsBarcode(svg, code, {
        format: "CODE128",
        displayValue: false, // el número va aparte, en texto
        margin: 0,
        height: 48,
        width: 2,
        background: "transparent",
        lineColor: "#000",
      });
      // JsBarcode fija ancho/alto en px; con viewBox el dibujo se escala al
      // ancho de la etiqueta sin deformarse.
      const w = svg.getAttribute("width");
      const h = svg.getAttribute("height");
      if (w && h) {
        svg.setAttribute("viewBox", `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
        svg.removeAttribute("width");
        svg.removeAttribute("height");
      }
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [code]);

  return (
    <div className={cn("rounded-2xl border bg-white px-4 py-3 text-black", className)}>
      <div className="min-w-0 text-center">
        {failed ? (
          <p className="py-3 text-xs text-muted-foreground">No se pudo dibujar el código</p>
        ) : (
          <svg ref={svgRef} className="h-10 w-full" preserveAspectRatio="none" aria-label={`Código ${code}`} />
        )}
        <p className="mt-1 font-mono text-xs tracking-[0.2em]">{code}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {supplierName} · ${price.toFixed(2)}
        </p>
      </div>
    </div>
  );
}

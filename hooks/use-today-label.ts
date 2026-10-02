"use client";

import * as React from "react";

// Fecha de hoy como DD/MM/YY para los títulos ("Mi Inventario Hoy 01/10/26").
// Se calcula sólo en el navegador (después de montar): el servidor corre en
// UTC y, después de las 5 p.m. hora del Pacífico, ya está en el día
// siguiente — calcularla al renderizar en ambos lados da fechas distintas y
// un error de hidratación. Mientras tanto devuelve "" (un instante).
export function useTodayLabel() {
  const [label, setLabel] = React.useState("");
  React.useEffect(() => {
    const today = new Date();
    setLabel(
      [
        String(today.getDate()).padStart(2, "0"),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getFullYear()).slice(-2),
      ].join("/")
    );
  }, []);
  return label;
}

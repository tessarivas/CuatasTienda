// Imprime un ticket (el mismo elemento que se ve como vista previa) en la
// impresora de tickets: EC Line EC-PM-58110, papel térmico de 58 mm.
//
// Se copia el HTML del ticket a un iframe oculto con los mismos estilos de
// la página y una hoja de 58 mm de ancho por el alto del ticket, sin
// márgenes, y se imprime ese iframe. Así lo que se ve en pantalla es
// exactamente lo que sale en papel, sin afectar la impresión del resto de
// la app. Los nodos con `data-print-hide` (p. ej.
// el proveedor de cada producto, que sólo le sirve a la tienda) se quitan.
//
// La impresora tiene que estar instalada en Windows con su driver y elegida
// en el cuadro de impresión. Para imprimir sin ese cuadro, abrir Chrome en
// la caja con --kiosk-printing.
export async function printTicket(element: HTMLElement) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    throw new Error("No se pudo preparar la impresión");
  }

  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[data-print-hide]").forEach((node) => node.remove());
  // Mismos estilos que la página (Tailwind y la fuente).
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join("");

  doc.open();
  doc.write(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<base href="${window.location.origin}/">${styles}
<style>
  html, body { margin: 0; padding: 0; background: #fff; }
</style></head><body class="${document.body.className}">${clone.outerHTML}</body></html>`);
  doc.close();

  // Esperar a que carguen hojas de estilo, fuentes e imágenes (el logo).
  await new Promise<void>((resolve) => {
    if (doc.readyState === "complete") resolve();
    else win.addEventListener("load", () => resolve(), { once: true });
  });
  await Promise.all(
    Array.from(doc.images).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          })
    )
  );
  await doc.fonts?.ready;

  // Hoja exactamente del tamaño del ticket: 58 mm de ancho por su alto real.
  // ("58mm auto" no es válido en CSS y Chrome lo ignora, cayendo a carta.)
  const ticket = doc.body.firstElementChild as HTMLElement | null;
  const heightPx = ticket?.getBoundingClientRect().height ?? doc.body.scrollHeight;
  const heightMm = Math.ceil((heightPx * 25.4) / 96) + 2;
  const pageStyle = doc.createElement("style");
  pageStyle.textContent = `@page { size: 58mm ${heightMm}mm; margin: 0; }`;
  doc.head.appendChild(pageStyle);

  win.focus();
  win.print();
  // print() bloquea hasta cerrar el cuadro; después ya se puede quitar.
  setTimeout(() => iframe.remove(), 1000);
}

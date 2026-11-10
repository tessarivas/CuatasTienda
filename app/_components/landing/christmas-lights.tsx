// Tiras de foquitos navideños colgando del borde de arriba del pie de página:
// una en cada esquina y una al centro, como guirnalda. Cada foco va cambiando
// de color (rojo, amarillo, verde, azul) desfasado de su vecino, así parece
// que la luz corre por la tira. Quien pidió menos movimiento en su sistema
// los ve fijos, cada uno de un color. Es de temporada: se quita del footer en
// page.tsx al terminar Navidad.

type Pt = { x: number; y: number };
type Strand = { from: Pt; via: Pt; to: Pt; bulbs: number };

// Punto sobre una curva cuadrática (de `from` a `to`, jalada hacia `via`).
const along = ({ from, via, to }: Strand, t: number): Pt => ({
  x: (1 - t) ** 2 * from.x + 2 * (1 - t) * t * via.x + t ** 2 * to.x,
  y: (1 - t) ** 2 * from.y + 2 * (1 - t) * t * via.y + t ** 2 * to.y,
});

const COLORS = 4;

function Garland({
  strand,
  width,
  height,
  offset,
  className,
}: {
  strand: Strand;
  width: number;
  height: number;
  // Para que las tres tiras no arranquen en el mismo color.
  offset: number;
  className: string;
}) {
  const { from, via, to, bulbs } = strand;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} overflow="visible" className={className} aria-hidden>
      <path
        d={`M${from.x} ${from.y} Q${via.x} ${via.y} ${to.x} ${to.y}`}
        fill="none"
        stroke="#3a3a3a"
        strokeWidth={1.5}
      />
      {Array.from({ length: bulbs }, (_, i) => {
        const p = along(strand, (i + 0.5) / bulbs);
        // Cuelgan hacia abajo, un poquito chuecos para que no se vean rígidos.
        const tilt = i % 2 === 0 ? -14 : 12;
        return (
          <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${tilt})`}>
            {/* Halo y foco cambian juntos de color (mismo desfase). */}
            <g className="xmas-bulb" style={{ animationDelay: `${-((i + offset) % COLORS)}s` }}>
              <ellipse cx={0} cy={9} rx={10} ry={12} opacity={0.18} />
              <ellipse cx={0} cy={9} rx={4.5} ry={6.5} />
            </g>
            <rect x={-2.5} y={-1} width={5} height={4} rx={1} fill="#555" />
          </g>
        );
      })}
    </svg>
  );
}

// Cada foco pasa por los 4 colores en 4 s. El brillo es una elipse grande y
// transparente detrás (un filter: drop-shadow dejaba un recuadro visible
// alrededor de cada tira).
const CSS = `
.xmas-bulb {
  fill: currentColor;
  color: var(--my-red);
  animation: xmas-bulb 4s infinite;
}
@keyframes xmas-bulb {
  0%, 20% { color: var(--my-red); }
  25%, 45% { color: var(--my-yellow); }
  50%, 70% { color: var(--my-green); }
  75%, 95% { color: var(--my-blue); }
  100% { color: var(--my-red); }
}
@media (prefers-reduced-motion: reduce) {
  .xmas-bulb { animation-play-state: paused; }
}
`;

export function ChristmasLights() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28">
      <style>{CSS}</style>
      {/* Esquina izquierda: baja del borde hacia la orilla de la pantalla. */}
      <Garland
        strand={{ from: { x: 170, y: 0 }, via: { x: 90, y: 70 }, to: { x: 0, y: 52 }, bulbs: 7 }}
        width={170}
        height={90}
        offset={0}
        className="absolute top-0 left-0 w-28 md:w-44"
      />
      {/* Centro: guirnalda que se cuelga entre dos puntos del borde. */}
      <Garland
        strand={{ from: { x: 0, y: 0 }, via: { x: 230, y: 80 }, to: { x: 460, y: 0 }, bulbs: 13 }}
        width={460}
        height={60}
        offset={1}
        className="absolute top-0 left-1/2 hidden w-[460px] -translate-x-1/2 md:block"
      />
      {/* Esquina derecha: la misma de la izquierda, al revés. */}
      <Garland
        strand={{ from: { x: 0, y: 0 }, via: { x: 80, y: 70 }, to: { x: 170, y: 52 }, bulbs: 7 }}
        width={170}
        height={90}
        offset={2}
        className="absolute top-0 right-0 w-28 md:w-44"
      />
    </div>
  );
}

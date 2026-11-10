import Image from "next/image";
import { DOCUMENTS } from "./content";

// Documentos que se imprimen al momento: las cuatro tarjetas a la vista, en
// una fila desde lg (dos por fila en celular y tablet). Sin deslizar.
export function DocumentsGrid() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 lg:grid-cols-4">
      {DOCUMENTS.map((doc) => (
        <article key={doc.title} className="min-w-0">
          <div className="relative aspect-4/3 overflow-hidden rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0_0_#000] md:shadow-[6px_6px_0_0_#000]">
            <Image
              src={doc.image}
              alt={`Ejemplo de ${doc.title}`}
              fill
              sizes="(min-width: 1280px) 300px, (min-width: 1024px) 25vw, 50vw"
              className="object-cover object-center"
            />
          </div>
          <h3 className="mt-4 text-sm leading-tight font-extrabold uppercase md:mt-5 md:text-lg">{doc.title}</h3>
          <p className="mt-1 text-xs md:text-sm">{doc.time}</p>
          <p className="text-xs md:text-sm">{doc.format}</p>
        </article>
      ))}
    </div>
  );
}

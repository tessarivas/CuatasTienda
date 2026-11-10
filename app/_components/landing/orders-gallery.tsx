import Image from "next/image";
import { cn } from "@/lib/utils";
import { GALLERY, QUOTE_TEXT, type GalleryItem } from "./content";

// "Así quedan nuestros pedidos": fotos de trabajos entregados mezcladas con
// lo que dijeron los clientes, en tres columnas (una sola en celular). Lo que
// aún no tiene foto o texto sale en gris; nunca se inventan opiniones.
export function OrdersGallery() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {GALLERY.map((column, c) => (
        <div key={c} className="flex flex-col gap-4">
          {column.map((item, i) => (
            <Tile key={i} item={item} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Tile({ item }: { item: GalleryItem }) {
  if (item.kind === "photo") {
    return (
      <figure
        className={cn(
          "relative overflow-hidden rounded-3xl bg-black/5",
          item.tall ? "aspect-3/5" : "aspect-4/3"
        )}
      >
        {item.image && (
          <Image
            src={item.image}
            alt={item.caption}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover"
          />
        )}
        <figcaption className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1 text-xs font-semibold">
          {item.caption}
        </figcaption>
      </figure>
    );
  }

  return (
    <blockquote className="rounded-3xl border-2 border-black p-6">
      <span aria-hidden className={cn("block text-5xl leading-none font-extrabold", QUOTE_TEXT[item.color])}>
        &ldquo;
      </span>
      {item.quote ? (
        <p className="mt-2 text-lg">{item.quote}</p>
      ) : (
        <div aria-hidden className="mt-3 space-y-2">
          <div className="h-4 w-full rounded-full bg-black/5" />
          <div className="h-4 w-4/5 rounded-full bg-black/5" />
        </div>
      )}
      <footer className="mt-5 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
          {item.name ? item.name.trim()[0]?.toUpperCase() : ""}
        </span>
        {item.name ? (
          <div className="min-w-0 text-sm">
            <p className="font-semibold">{item.name}</p>
            {item.product && <p className="text-black/50">{item.product}</p>}
          </div>
        ) : (
          <div aria-hidden className="flex-1 space-y-1.5">
            <div className="h-3 w-1/3 rounded-full bg-black/5" />
            <div className="h-3 w-1/4 rounded-full bg-black/5" />
          </div>
        )}
      </footer>
    </blockquote>
  );
}

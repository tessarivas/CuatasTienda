"use client";

import * as React from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

// next/image que aparece con un fundido corto cuando termina de bajar, en
// vez de "pintarse" de golpe a medias. Úsalo para fotos de productos y logos
// (lo que viene de Cloudinary); el contenedor debe tener su fondo bg-muted
// para que mientras carga se vea el hueco y no un blanco.
// next/image llama a onLoad también si la imagen ya estaba en caché, así que
// nunca se queda invisible.
export function FadeInImage({ className, onLoad, alt, ...props }: ImageProps) {
  const [loaded, setLoaded] = React.useState(false);
  return (
    <Image
      {...props}
      alt={alt}
      className={cn(
        "transition-opacity duration-300",
        loaded ? "opacity-100" : "opacity-0",
        className
      )}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
    />
  );
}

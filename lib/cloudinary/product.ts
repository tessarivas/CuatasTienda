import cloudinary from "./cloudinary";

// Sube la foto del producto a `products/{code}/picture`, sobreescribiendo
// siempre el mismo public_id. El código del producto es único e inmutable,
// así que el folder se mantiene estable aunque cambie el título.
export async function uploadProductImage(file: Buffer, code: string) {
  return new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `products/${code}`,
          public_id: "picture",
          overwrite: true,
          resource_type: "image",
        },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve({ secure_url: result.secure_url });
        }
      )
      .end(file);
  });
}

// Elimina la foto del producto (útil al limpiar uploads huérfanos).
export async function deleteProductImage(code: string) {
  await cloudinary.uploader.destroy(`products/${code}/picture`);
}

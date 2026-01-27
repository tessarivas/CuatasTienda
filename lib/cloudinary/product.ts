import cloudinary from "./cloudinary";

// Sanitize name for use in Cloudinary public_id
function sanitizeFolderName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]/g, "-") // Replace non-alphanumeric with hyphen
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Trim hyphens from start/end
}

// Upload product image (folder: products/{productId}-{title}/picture)
export async function uploadProductImage(
  file: Buffer,
  productId: number,
  productTitle: string
) {
  const folderName = `${productId}-${sanitizeFolderName(productTitle)}`;
  return new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `products/${folderName}`,
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

// Delete product image
export async function deleteProductImage(productId: number, productTitle: string) {
  const folderName = `${productId}-${sanitizeFolderName(productTitle)}`;
  await cloudinary.uploader.destroy(
    `products/${folderName}/picture`
  );
}

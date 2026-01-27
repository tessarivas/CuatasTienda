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

// Upload (always same public_id → overwrite)
export async function uploadSupplierImage(
  file: Buffer,
  supplierId: number,
  supplierName: string
) {
  const folderName = `${supplierId}-${sanitizeFolderName(supplierName)}`;
  return new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `suppliers/${folderName}`,
          public_id: "logo",
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

// Delete (deterministic public_id)
export async function deleteSupplierImage(supplierId: number, supplierName: string) {
  const folderName = `${supplierId}-${sanitizeFolderName(supplierName)}`;
  await cloudinary.uploader.destroy(
    `suppliers/${folderName}/logo`
  );
}
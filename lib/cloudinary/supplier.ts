import cloudinary from "./cloudinary";

// Upload (always same public_id → overwrite)
export async function uploadSupplierImage(
  file: Buffer,
  supplierId: number
) {
  return new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          public_id: `suppliers/${supplierId}/logo`,
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
export async function deleteSupplierImage(supplierId: number) {
  await cloudinary.uploader.destroy(
    `suppliers/${supplierId}/logo`
  );
}
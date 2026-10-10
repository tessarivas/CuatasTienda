import cloudinary from "./cloudinary";
import { cloudinaryLabel, relabelImage, uploadImage } from "./upload";

type SupplierNames = { name: string; businessName: string | null };

// Cómo se llama el proveedor en Cloudinary: el nombre del negocio ("Full
// Moons") y, si no tiene, el del contacto.
function supplierLabel(supplier: SupplierNames): string {
  return cloudinaryLabel(supplier.businessName?.trim() || supplier.name);
}

// Carpeta visible donde quedan las fotos de sus productos.
export function supplierProductsFolder(supplier: SupplierNames): string {
  return `products/${supplierLabel(supplier)}`;
}

// Logo: public_id `suppliers/{id}` (el id no cambia), en la carpeta visible
// `suppliers` con el nombre del proveedor.
function logoPublicId(supplierId: number) {
  return `suppliers/${supplierId}`;
}

export function uploadSupplierImage(
  file: Buffer,
  supplier: SupplierNames & { id: number }
) {
  return uploadImage(file, "logo", {
    publicId: logoPublicId(supplier.id),
    assetFolder: "suppliers",
    displayName: supplierLabel(supplier),
  });
}

export async function deleteSupplierImage(supplierId: number) {
  await cloudinary.uploader.destroy(logoPublicId(supplierId));
}

// Al renombrar un proveedor: su carpeta de productos y el nombre de su logo
// siguen al nombre nuevo. Ninguna URL cambia. Si dos proveedores se llamaran
// igual compartirían carpeta (es sólo visual).
export async function relabelSupplierImages(
  before: SupplierNames,
  after: SupplierNames & { id: number; logo: string | null }
) {
  const from = supplierProductsFolder(before);
  const to = supplierProductsFolder(after);
  if (from === to) return;
  try {
    await cloudinary.api.rename_folder(from, to);
  } catch (err) {
    // Lo normal es que no exista todavía (proveedor sin fotos de productos).
    console.warn("No se renombró la carpeta en Cloudinary", from, "→", to, err);
  }
  if (after.logo) {
    await relabelImage(logoPublicId(after.id), {
      displayName: supplierLabel(after),
    });
  }
}

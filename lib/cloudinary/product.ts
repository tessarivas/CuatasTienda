import cloudinary from "./cloudinary";
import { supplierProductsFolder } from "./supplier";
import { cloudinaryLabel, relabelImage, uploadImage } from "./upload";

type ProductPlacement = {
  code: string;
  title: string;
  Supplier: { name: string; businessName: string | null } | null;
};

function productFolder(product: ProductPlacement) {
  return product.Supplier
    ? supplierProductsFolder(product.Supplier)
    : "products/Sin proveedor";
}

// La foto del producto tiene public_id `products/{code}`: el código es único
// y nunca cambia, así que la URL guardada tampoco. En la Media Library se ve
// en `products/{Proveedor}` con el nombre del producto; si cambia el título o
// el proveedor, `relabelProductImage` la reacomoda.
function productPublicId(code: string) {
  return `products/${code}`;
}

export function uploadProductImage(file: Buffer, product: ProductPlacement) {
  return uploadImage(file, "product", {
    publicId: productPublicId(product.code),
    assetFolder: productFolder(product),
    displayName: cloudinaryLabel(product.title),
  });
}

export function relabelProductImage(product: ProductPlacement) {
  return relabelImage(productPublicId(product.code), {
    assetFolder: productFolder(product),
    displayName: cloudinaryLabel(product.title),
  });
}

// Elimina la foto del producto (útil al limpiar uploads huérfanos).
export async function deleteProductImage(code: string) {
  await cloudinary.uploader.destroy(productPublicId(code));
}

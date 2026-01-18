"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type Product } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SupplierProductsListProps {
  products: Product[];
  supplierId: string;
}

export function SupplierProductsList({
  products,
  supplierId,
}: SupplierProductsListProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Productos ({products.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {products.length > 0 ? (
          <div className="space-y-2">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={product.photoUrl}
                    alt={product.title}
                    width={48}
                    height={48}
                    className="rounded object-cover aspect-square"
                  />
                  <div>
                    <p className="font-medium">{product.title}</p>
                    <p className="text-sm text-muted-foreground">
                      ${product.price.toFixed(2)} • Stock: {product.quantity}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    router.push(`/admin/dashboard/inventory/${product.id}`)
                  }
                  className="cursor-pointer"
                >
                  Ver
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Este proveedor no tiene productos registrados</p>
            <Button
              variant="outline"
              className="mt-4 cursor-pointer"
              onClick={() =>
                router.push(`/admin/dashboard/inventory?supplier=${supplierId}`)
              }
            >
              Agregar Producto
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

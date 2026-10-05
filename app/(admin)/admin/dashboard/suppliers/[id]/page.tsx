"use client";

import * as React from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { DashboardContext } from "../../layout";
import {
  type Supplier,
  type Product,
  type ProductStatus,
  type ProductType,
} from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  PackagePlus,
  Search,
  Wrench,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { SupplierDetailsForm } from "../_components/supplier-details-form";
import { EditSupplierModal } from "../_components/edit-supplier-modal";
import { SupplierProductsList } from "../_components/supplier-products-list";
import { DeleteSupplierDialog } from "../_components/delete-supplier-dialog";
import { MonthlyCutoff } from "../_components/monthly-cutoff";
import { AddProductModal } from "../../inventory/_components/add-product-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/lib/toast";

// Shape returned by GET /api/suppliers/[id] — Prisma `include: { Product }`.
// Decimal columns serialize to strings, `picture` may be null.
type ApiSupplierWithProducts = Supplier & {
  Product?: Array<{
    id: number;
    title: string;
    price: string | number;
    status: string;
    type?: string;
    picture: string | null;
    quantity: number | null;
    code: string | null;
    supplierId: number | null;
    reservedCount?: number;
  }>;
};

export default function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { suppliers } = React.useContext(DashboardContext);

  const [supplier, setSupplier] =
    React.useState<ApiSupplierWithProducts | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isAddProductModalOpen, setIsAddProductModalOpen] =
    React.useState(false);
  const [addProductType, setAddProductType] =
    React.useState<ProductType>("PRODUCT");

  const handleOpenAddProductModal = (type: ProductType) => {
    setAddProductType(type);
    setIsAddProductModalOpen(true);
  };

  const reloadSupplier = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/suppliers/${id}`);
      if (!res.ok) {
        setSupplier(null);
        return;
      }
      const data: ApiSupplierWithProducts = await res.json();
      setSupplier(data);
    } catch {
      setSupplier(null);
    }
  }, [id]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/suppliers/${id}`);
        if (!res.ok) {
          if (!cancelled) setSupplier(null);
          return;
        }
        const data: ApiSupplierWithProducts = await res.json();
        if (cancelled) return;
        setSupplier(data);
      } catch {
        if (!cancelled) setSupplier(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleCutoffDayChange = async (newDay: number) => {
    if (!supplier) return;
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cutoffDay: newDay }),
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        toast.error(message ?? "No se pudo actualizar el día de corte");
        return;
      }
      const updated: Supplier = await res.json();
      // PATCH no devuelve el array anidado Product — hay que conservarlo.
      setSupplier({ ...updated, Product: supplier.Product });
      toast.success(`Día de corte cambiado al ${newDay}`);
    } catch {
      toast.error("No se pudo actualizar el día de corte");
    }
  };

  const handleDelete = async () => {
    if (!supplier) return;
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        toast.error(message ?? "No se pudo eliminar el proveedor");
        return;
      }
      toast.success("Proveedor eliminado");
      router.push("/admin/dashboard/suppliers");
    } catch {
      toast.error("No se pudo eliminar el proveedor");
    }
  };

  // Products come nested from GET /api/suppliers/[id]. Map the DB shape to
  // what SupplierProductsList expects (photoUrl instead of picture, price as
  // a number), hide soft-deleted rows, and filter by searchTerm.
  const supplierProducts: Product[] = React.useMemo(() => {
    const raw = supplier?.Product ?? [];
    const mapped: Product[] = raw
      .filter((p) => p.status !== "Retirado")
      .map((p) => ({
        id: String(p.id),
        supplierId: String(p.supplierId ?? ""),
        title: p.title,
        price: Number(p.price),
        quantity: p.quantity ?? 0,
        status: p.status as ProductStatus,
        type: (p.type === "SERVICE" ? "SERVICE" : "PRODUCT") as ProductType,
        photoUrl: p.picture ?? "",
        barcode: p.code ?? undefined,
        reservedCount: p.reservedCount ?? 0,
      }));
    const term = searchTerm.trim().toLowerCase();
    if (!term) return mapped;
    return mapped.filter((p) => p.title.toLowerCase().includes(term));
  }, [supplier, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 h-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando proveedor...</p>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">Proveedor no encontrado</p>
          <p className="text-sm text-muted-foreground">
            No se pudo encontrar el proveedor con ID: {id}
          </p>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="cursor-pointer"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-4">
        {/* Encabezado con título + búsqueda + CTA */}
        <div className="flex flex-col md:flex-row md:items-center md:gap-4">
          <div className="flex items-center gap-2">
            <Button
              className="cursor-pointer"
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">{supplier.businessName}</h1>
          </div>
          <div className="mt-4 md:mt-0 md:ml-auto flex items-center gap-2">
            <div className="relative grow">
              <Input
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-lg pl-10"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="cursor-pointer">
                  Agregar
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => handleOpenAddProductModal("PRODUCT")}
                >
                  <PackagePlus className="h-4 w-4" />
                  Agregar Producto
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => handleOpenAddProductModal("SERVICE")}
                >
                  <Wrench className="h-4 w-4" />
                  Agregar Servicio
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Corte Mensual del Proveedor */}
          <MonthlyCutoff
            supplier={supplier}
            onCutoffDayChange={handleCutoffDayChange}
          />
          {/* Productos del Proveedor */}
          <SupplierProductsList
            products={supplierProducts}
            supplierId={id}
            supplierName={supplier.businessName}
            onProductChanged={reloadSupplier}
          />
        </div>

        {/* Detalles del Proveedor (sólo lectura; se edita en el modal) */}
        <SupplierDetailsForm
          supplier={supplier}
          onEdit={() => setIsEditModalOpen(true)}
        />
      </div>

      <EditSupplierModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        supplier={supplier}
        onSaved={reloadSupplier}
        onDelete={() => {
          // Se cierra primero para no anidar el AlertDialog dentro del Dialog.
          setIsEditModalOpen(false);
          setShowDeleteDialog(true);
        }}
      />

      <DeleteSupplierDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        supplier={supplier}
        supplierProductsCount={supplierProducts.length}
        onDelete={handleDelete}
      />

      <AddProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onAdd={() => {
          reloadSupplier();
        }}
        suppliers={suppliers}
        supplierId={id}
        type={addProductType}
      />
    </>
  );
}

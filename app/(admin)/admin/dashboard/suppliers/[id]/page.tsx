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
  const [isSaving, setIsSaving] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedSupplier, setEditedSupplier] =
    React.useState<ApiSupplierWithProducts | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = React.useState<File | null>(
    null
  );
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isAddProductModalOpen, setIsAddProductModalOpen] =
    React.useState(false);
  const [addProductType, setAddProductType] =
    React.useState<ProductType>("PRODUCT");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleOpenAddProductModal = (type: ProductType) => {
    setAddProductType(type);
    setIsAddProductModalOpen(true);
  };

  const reloadSupplier = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/suppliers/${id}`);
      if (!res.ok) {
        setSupplier(null);
        setEditedSupplier(null);
        return;
      }
      const data: ApiSupplierWithProducts = await res.json();
      setSupplier(data);
      // Sólo resetea `editedSupplier` si no hay una edición en progreso,
      // para no perder los cambios del formulario abierto.
      setEditedSupplier((prev) =>
        prev ? { ...prev, Product: data.Product } : data
      );
    } catch {
      setSupplier(null);
      setEditedSupplier(null);
    }
  }, [id]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/suppliers/${id}`);
        if (!res.ok) {
          if (!cancelled) {
            setSupplier(null);
            setEditedSupplier(null);
          }
          return;
        }
        const data: ApiSupplierWithProducts = await res.json();
        if (cancelled) return;
        setSupplier(data);
        setEditedSupplier(data);
      } catch {
        if (!cancelled) {
          setSupplier(null);
          setEditedSupplier(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editedSupplier) return;
    const { name, value } = e.target;
    setEditedSupplier({ ...editedSupplier, [name]: value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && editedSupplier) {
      const file = e.target.files[0];
      const newLogoUrl = URL.createObjectURL(file);
      setPendingLogoFile(file);
      setEditedSupplier({ ...editedSupplier, logo: newLogoUrl });
    }
  };

  const handleSave = async () => {
    if (!editedSupplier || !supplier || isSaving) return;
    setIsSaving(true);
    try {
      const patchRes = await fetch(`/api/suppliers/${supplier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editedSupplier.name,
          businessName: editedSupplier.businessName,
          cellphone: editedSupplier.cellphone ?? null,
          email: editedSupplier.email ?? null,
        }),
      });
      if (!patchRes.ok) {
        const { error: message } = await patchRes.json();
        alert(message ?? "No se pudo guardar el proveedor");
        return;
      }
      let updated: Supplier = await patchRes.json();

      if (pendingLogoFile) {
        const formData = new FormData();
        formData.append("file", pendingLogoFile);
        const logoRes = await fetch(`/api/suppliers/${supplier.id}`, {
          method: "POST",
          body: formData,
        });
        if (!logoRes.ok) {
          const { error: message } = await logoRes.json();
          alert(
            message ??
              "El proveedor se guardó, pero no se pudo subir el nuevo logo"
          );
        } else {
          updated = await logoRes.json();
        }
      }

      // PATCH / POST logo don't return the nested Product array — preserve it.
      const merged: ApiSupplierWithProducts = {
        ...updated,
        Product: supplier.Product,
      };
      setSupplier(merged);
      setEditedSupplier(merged);
      setPendingLogoFile(null);
      setIsEditing(false);
    } catch {
      alert("No se pudo guardar el proveedor");
    } finally {
      setIsSaving(false);
    }
  };

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
        alert(message ?? "No se pudo actualizar el día de corte");
        return;
      }
      const updated: Supplier = await res.json();
      const merged: ApiSupplierWithProducts = {
        ...updated,
        Product: supplier.Product,
      };
      setSupplier(merged);
      setEditedSupplier(merged);
    } catch {
      alert("No se pudo actualizar el día de corte");
    }
  };

  const handleCancelEdit = () => {
    setEditedSupplier(supplier);
    setPendingLogoFile(null);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!supplier) return;
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        alert(message ?? "No se pudo eliminar el proveedor");
        return;
      }
      router.push("/admin/dashboard/suppliers");
    } catch {
      alert("No se pudo eliminar el proveedor");
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

        {/* Formulario de Detalles del Proveedor */}
        <SupplierDetailsForm
          supplier={supplier}
          editedSupplier={editedSupplier}
          isEditing={isEditing}
          onInputChange={handleInputChange}
          onImageChange={handleImageChange}
          onEdit={() => setIsEditing(true)}
          onSave={handleSave}
          onCancel={handleCancelEdit}
          onDelete={() => setShowDeleteDialog(true)}
          fileInputRef={fileInputRef}
        />
      </div>

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

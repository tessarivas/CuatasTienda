"use client";

import * as React from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { type Supplier, type Product, type ProductStatus } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SupplierDetailsForm } from "../_components/supplier-details-form";
import { SupplierProductsList } from "../_components/supplier-products-list";
import { DeleteSupplierDialog } from "../_components/delete-supplier-dialog";
import { MonthlyCutoff } from "../_components/monthly-cutoff";

// Shape returned by GET /api/suppliers/[id] — Prisma `include: { Product }`.
// Decimal columns serialize to strings, `picture` may be null.
type ApiSupplierWithProducts = Supplier & {
  Product?: Array<{
    id: number;
    title: string;
    price: string | number;
    status: string;
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      setEditedSupplier((prev) => (prev ? { ...prev, Product: data.Product } : data));
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
          alert(message ?? "El proveedor se guardó, pero no se pudo subir el nuevo logo");
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
  // a number), and hide soft-deleted rows.
  const supplierProducts: Product[] = React.useMemo(() => {
    const raw = supplier?.Product ?? [];
    return raw
      .filter((p) => p.status !== "Retirado")
      .map((p) => ({
        id: String(p.id),
        supplierId: String(p.supplierId ?? ""),
        title: p.title,
        price: Number(p.price),
        quantity: p.quantity ?? 0,
        status: p.status as ProductStatus,
        photoUrl: p.picture ?? "",
        barcode: p.code ?? undefined,
        reservedCount: p.reservedCount ?? 0,
      }));
  }, [supplier]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg font-semibold">Proveedor no encontrado</p>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mt-4 cursor-pointer"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6 p-4 md:p-6 max-w-full mx-auto">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Corte Mensual del Proveedor */}
          <MonthlyCutoff
            supplier={supplier}
            onCutoffDayChange={handleCutoffDayChange}
          />
          {/* Productos del Proveedor - PASAMOS EL NOMBRE */}
          <SupplierProductsList
            products={supplierProducts}
            supplierId={id}
            supplierName={supplier.businessName}
            onProductChanged={reloadSupplier}
          />
        </div>
      </div>

      <DeleteSupplierDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        supplier={supplier}
        supplierProductsCount={supplierProducts.length}
        onDelete={handleDelete}
      />
    </>
  );
}

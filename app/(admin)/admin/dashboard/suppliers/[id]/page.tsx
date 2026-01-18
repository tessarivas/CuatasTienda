"use client";

import * as React from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { DashboardContext } from "../../layout";
import { type Supplier } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SupplierDetailsForm } from "../_components/supplier-details-form";
import { SupplierProductsList } from "../_components/supplier-products-list";
import { DeleteSupplierDialog } from "../_components/delete-supplier-dialog";
import { MonthlyCutoff } from "../_components/monthly-cutoff";

export default function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { products } = React.useContext(DashboardContext);

  // Estado local de proveedores (temporal hasta integrar con contexto global)
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [supplier, setSupplier] = React.useState<Supplier | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedSupplier, setEditedSupplier] = React.useState<Supplier | null>(
    null
  );
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Cargar proveedores desde initialSuppliers (puedes mover esto al contexto después)
  React.useEffect(() => {
    import("@/lib/data").then((data) => {
      setSuppliers(data.initialSuppliers);
      const foundSupplier = data.initialSuppliers.find((s) => s.id === id);
      setSupplier(foundSupplier || null);
      setEditedSupplier(foundSupplier || null);
    });
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
      setEditedSupplier({ ...editedSupplier, logo: newLogoUrl });
    }
  };

  const handleSave = () => {
    if (editedSupplier) {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === editedSupplier.id ? editedSupplier : s))
      );
      setSupplier(editedSupplier);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedSupplier(supplier);
    setIsEditing(false);
  };

  const handleDelete = () => {
    // Aquí puedes agregar lógica adicional como verificar si tiene productos
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    router.push("/admin/dashboard/suppliers");
  };

  // Obtener productos del proveedor
  const supplierProducts = React.useMemo(() => {
    return products.filter((p) => p.supplierId === id);
  }, [products, id]);

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
      <div className="flex flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto">
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

        <div className="grid grid-cols-2 gap-6">
          <MonthlyCutoff supplier={supplier} />

          <SupplierProductsList products={supplierProducts} supplierId={id} />
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

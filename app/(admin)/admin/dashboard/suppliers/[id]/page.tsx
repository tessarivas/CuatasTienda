"use client";

import * as React from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { DashboardContext } from "../../layout";
import { type Supplier, type Client } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PackagePlus, Search } from "lucide-react";
import { SupplierDetailsForm } from "../_components/supplier-details-form";
import { SupplierProductsList } from "../_components/supplier-products-list";
import { DeleteSupplierDialog } from "../_components/delete-supplier-dialog";
import { MonthlyCutoff } from "../_components/monthly-cutoff";
import { Input } from "@/components/ui/input";
import { AddProductModal } from "../../inventory/_components/add-product-modal";

export default function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { products, suppliers: allSuppliers, reloadProducts } =
    React.useContext(DashboardContext) as {
      products: any[];
      suppliers: Supplier[];
      reloadProducts: () => Promise<void>;
      clients: Client[];
    };

  // Estado local de proveedores (temporal hasta integrar con contexto global)
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [supplier, setSupplier] = React.useState<Supplier | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedSupplier, setEditedSupplier] = React.useState<Supplier | null>(
    null,
  );
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isAddProductModalOpen, setIsAddProductModalOpen] =
    React.useState(false);

  // Cargar proveedores desde initialSuppliers
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
        prev.map((s) => (s.id === editedSupplier.id ? editedSupplier : s)),
      );
      setSupplier(editedSupplier);
      setIsEditing(false);
      // Aquí podrías añadir una notificación de éxito
    }
  };

  const handleCutoffDayChange = (newDay: number) => {
    if (editedSupplier) {
      const updatedSupplier = { ...editedSupplier, cutoffDay: newDay };
      setEditedSupplier(updatedSupplier);
      // Opcional: Guardar inmediatamente o esperar al guardado general
      setSupplier(updatedSupplier);
      setSuppliers((prev) =>
        prev.map((s) => (s.id === updatedSupplier.id ? updatedSupplier : s)),
      );
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

  // Obtener y filtrar productos del proveedor
  const supplierProducts = React.useMemo(() => {
    const allSupplierProducts = products.filter((p) => p.supplierId === id);
    if (!searchTerm) {
      return allSupplierProducts;
    }
    return allSupplierProducts.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [products, id, searchTerm]);

  const handleProductAdded = async () => {
    await reloadProducts();
  };

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
      <div className="p-4 space-y-4">
        {/* Sección del Encabezado */}
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
          {/* Busqueda y Agregar Producto */}
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
            <Button onClick={() => setIsAddProductModalOpen(true)}>
              <PackagePlus className="h-4 w-4" />
              Agregar Productos
            </Button>
          </div>
        </div>

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
        onAdd={handleProductAdded}
        suppliers={allSuppliers}
        supplierId={id}
      />
    </>
  );
}

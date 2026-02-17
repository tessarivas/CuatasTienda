"use client";

import * as React from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { DashboardContext } from "../../layout";
import { type Supplier, type Client } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PackagePlus, Search, Loader2 } from "lucide-react"; // Importar Loader2
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
  
  const { 
    products, 
    suppliers,
    reloadProducts,
    reloadSuppliers
  } = React.useContext(DashboardContext);

  const [supplier, setSupplier] = React.useState<Supplier | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedSupplier, setEditedSupplier] = React.useState<Supplier | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isAddProductModalOpen, setIsAddProductModalOpen] = React.useState(false);
  
  // Nuevo estado para controlar la carga inicial
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Si ya tenemos proveedores en el contexto, buscamos
    if (suppliers.length > 0) {
      const foundSupplier = suppliers.find((s) => String(s.id) === String(id)); // Asegurar comparación de tipos
      
      if (foundSupplier) {
        setSupplier(foundSupplier);
        setEditedSupplier(foundSupplier);
      }
      // Ya terminamos de intentar cargar (sea que lo encontramos o no)
      setIsLoading(false);
    } else {
        // Podríamos intentar un fetch individual aquí si la lista global tarda, 
        // pero por ahora asumiremos que si suppliers es [], se está cargando el layout.
        // Opcional: Podrías hacer un fetch específico aquí para este ID si la lista global falla.
        
        // Si suppliers está vacío, esperamos un poco o hacemos fetch directo (opcional)
        const fetchSupplier = async () => {
            try {
                const res = await fetch(`/api/suppliers/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setSupplier(data);
                    setEditedSupplier(data);
                }
            } catch (error) {
                console.error("Error fetching single supplier:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSupplier();
    }
  }, [id, suppliers]);

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

  const handleSave = async () => {
    if (editedSupplier) {
        // Simulación:
      setSupplier(editedSupplier);
      setIsEditing(false);
      await reloadSuppliers();
    }
  };

  const handleCutoffDayChange = (newDay: number) => {
    if (editedSupplier) {
      const updatedSupplier = { ...editedSupplier, cutoffDay: newDay };
      setEditedSupplier(updatedSupplier);
      setSupplier(updatedSupplier);
    }
  };

  const handleCancelEdit = () => {
    setEditedSupplier(supplier);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    try {
        await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
        await reloadSuppliers();
        router.push("/admin/dashboard/suppliers");
    } catch (e) {
        router.push("/admin/dashboard/suppliers");
    }
  };

  const supplierProducts = React.useMemo(() => {
    // Asegurarse de comparar IDs como strings para evitar problemas de tipos
    const allSupplierProducts = products.filter((p) => String(p.supplierId) === String(id));
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

  // Renderizado condicional mejorado
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
          <p className="text-sm text-muted-foreground">No se pudo encontrar el proveedor con ID: {id}</p>
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
            <Button onClick={() => setIsAddProductModalOpen(true)} className="cursor-pointer">
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
        suppliers={suppliers} 
        supplierId={id}
      />
    </>
  );
}

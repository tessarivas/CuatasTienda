// app/(admin)/admin/dashboard/suppliers/[id]/page.tsx
"use client";

import * as React from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { DashboardContext } from "../../layout";
import { type Supplier } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, User, Pencil, ArrowLeft, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [editedSupplier, setEditedSupplier] = React.useState<Supplier | null>(null);
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
        {/* Header con botón de regresar */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Editar Proveedor" : "Detalles del Proveedor"}
          </h1>
        </div>

        {/* Card principal con información del proveedor */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Información General</CardTitle>
            {!isEditing && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="cursor-pointer"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="cursor-pointer"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
              {/* Columna del Logo */}
              <div className="flex flex-col items-center gap-4 py-6 lg:border-r lg:pr-8">
                <div className="relative">
                  <Image
                    src={editedSupplier?.logo || supplier.logo}
                    alt={`Logo de ${supplier.businessName}`}
                    width={120}
                    height={120}
                    className="object-cover aspect-square rounded-lg border-2"
                  />
                  {isEditing && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Columnas de Campos de información */}
              <div className="space-y-6 lg:col-span-2 lg:pl-8 lg:pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nombre del negocio */}
                  <div className="space-y-2">
                    <Label htmlFor="businessName" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Nombre del Negocio
                    </Label>
                    {isEditing ? (
                      <Input
                        id="businessName"
                        name="businessName"
                        value={editedSupplier?.businessName || ""}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <p className="text-lg font-semibold">{supplier.businessName}</p>
                    )}
                  </div>

                  {/* Nombre del proveedor */}
                  <div className="space-y-2">
                    <Label htmlFor="providerName" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Nombre del Proveedor
                    </Label>
                    {isEditing ? (
                      <Input
                        id="providerName"
                        name="providerName"
                        value={editedSupplier?.providerName || ""}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <p className="font-medium">{supplier.providerName}</p>
                    )}
                  </div>

                  {/* Teléfono */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Teléfono
                    </Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        name="phone"
                        value={editedSupplier?.phone || ""}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <p className="font-medium">{supplier.phone}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Correo Electrónico
                    </Label>
                    {isEditing ? (
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={editedSupplier?.email || ""}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <p className="font-medium">{supplier.email}</p>
                    )}
                  </div>
                </div>

                {/* Botones de acción en modo edición */}
                {isEditing && (
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="flex-1 cursor-pointer"
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} className="flex-1 cursor-pointer">
                      Guardar Cambios
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de productos del proveedor */}
        <Card>
          <CardHeader>
            <CardTitle>
              Productos ({supplierProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {supplierProducts.length > 0 ? (
              <div className="space-y-2">
                {supplierProducts.map((product) => (
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
                    router.push(`/admin/dashboard/inventory?supplier=${id}`)
                  }
                >
                  Agregar Producto
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente a {supplier.businessName}.
              {supplierProducts.length > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Advertencia: Este proveedor tiene {supplierProducts.length}{" "}
                  producto(s) asociado(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
// app/(admin)/admin/dashboard/pos/page.tsx
"use client";

import * as React from "react";
import { DashboardContext } from "../layout";
import { type CartItem, type PaymentMethod, type Discount } from "@/lib/data";
import { ProductGrid } from "./_components/product-grid";
import { Cart } from "./_components/cart";
import { SaleCompleteModal } from "./_components/sale-complete-modal";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { type ApiSaleRow } from "../sales/sales-utils";

// Respuesta de POST /api/sales: la venta con la misma forma que el
// Historial de Ventas (Decimal llega como string), para armar el ticket.
type ApiSale = ApiSaleRow;

export default function POSPage() {
  const { products, setProducts, isLoadingProducts } =
    React.useContext(DashboardContext);

  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [totalDiscount, setTotalDiscount] = React.useState<Discount | undefined>();
  const [showCompleteModal, setShowCompleteModal] = React.useState(false);
  // Última venta cobrada, para el ticket de "¡Venta completada!".
  const [lastSale, setLastSale] = React.useState<ApiSale | null>(null);
  // Hoja del carrito en celular: plegada (sólo total y Cobrar) o desplegada.
  const [isCartExpanded, setIsCartExpanded] = React.useState(false);

  // Unidades libres para vender (descontando las reservadas en apartados).
  // Los servicios no manejan stock: se consideran ilimitados en caja.
  const availableOf = (product: {
    quantity: number;
    reservedCount?: number;
    type?: "PRODUCT" | "SERVICE";
  }) =>
    product.type === "SERVICE"
      ? Infinity
      : product.quantity - (product.reservedCount ?? 0);

  // Agregar producto al carrito
  const handleAddToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    if (availableOf(product) <= 0) return;

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === productId);

      if (existingItem) {
        if (existingItem.quantity >= availableOf(product)) {
          return prevCart; // sin stock libre adicional
        }
        return prevCart.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { product, quantity: 1 }];
      }
    });
  };

  // Actualizar cantidad de un item
  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (!product) return;
    if (quantity > availableOf(product)) return;

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  // Remover item del carrito
  const handleRemoveFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  // Aplicar descuento a un producto
  const handleApplyItemDiscount = (productId: string, discount?: Discount) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, discount } : item
      )
    );
  };

  // Procesar venta: se guarda en la BD (POST /api/sales), que recalcula
  // precios y descuentos, valida stock y genera el folio DDMMYY-NNN. La
  // pantalla sólo refleja lo que devolvió el servidor.
  const [isProcessing, setIsProcessing] = React.useState(false);
  const handleProcessSale = async (paymentMethod: PaymentMethod) => {
    if (cart.length === 0 || isProcessing) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: Number(item.product.id),
            quantity: item.quantity,
            discount: item.discount,
          })),
          totalDiscount,
          paymentMethod,
        }),
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        toast.error(message ?? "No se pudo registrar la venta");
        return;
      }
      const { sale }: { sale: ApiSale } = await res.json();

      // Reflejar el stock que ya descontó el servidor. Los servicios no
      // descuentan inventario; un producto en 0 pasa a "Vendido".
      setProducts((prevProducts) =>
        prevProducts.map((product) => {
          const cartItem = cart.find((item) => item.product.id === product.id);
          if (cartItem && product.type !== "SERVICE") {
            const quantity = product.quantity - cartItem.quantity;
            return {
              ...product,
              quantity,
              status: quantity === 0 ? ("Vendido" as const) : product.status,
            };
          }
          return product;
        })
      );

      setLastSale(sale);
      setShowCompleteModal(true);
      setIsCartExpanded(false);
      setCart([]);
      setTotalDiscount(undefined);
    } catch {
      toast.error("No se pudo registrar la venta");
    } finally {
      setIsProcessing(false);
    }
  };

  // Calcular subtotal sin descuentos
  const calculateSubtotal = () => {
    return cart.reduce((total, item) => {
      return total + item.product.price * item.quantity;
    }, 0);
  };

  // Calcular descuento total de items
  const calculateItemsDiscount = () => {
    return cart.reduce((total, item) => {
      if (!item.discount) return total;

      const itemTotal = item.product.price * item.quantity;
      if (item.discount.type === "percentage") {
        return total + itemTotal * (item.discount.value / 100);
      } else {
        return total + item.discount.value;
      }
    }, 0);
  };

  // Calcular total final
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const itemsDiscount = calculateItemsDiscount();
    let finalTotal = subtotal - itemsDiscount;

    if (totalDiscount) {
      if (totalDiscount.type === "percentage") {
        finalTotal -= finalTotal * (totalDiscount.value / 100);
      } else {
        finalTotal -= totalDiscount.value;
      }
    }

    return Math.max(0, finalTotal);
  };

  // Mismo loader que suppliers/[id]: products viene de DashboardContext
  // (fetch en layout.tsx), no de un fetch propio de esta página.
  if (isLoadingProducts) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 h-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando caja registradora...</p>
        </div>
      </div>
    );
  }

  // Mismo carrito en las dos presentaciones (columna o hoja de celular).
  const renderCart = (sheet?: { expanded: boolean; onToggle: () => void }) => (
    <Cart
      cart={cart}
      onUpdateQuantity={handleUpdateQuantity}
      onRemoveItem={handleRemoveFromCart}
      onApplyItemDiscount={handleApplyItemDiscount}
      totalDiscount={totalDiscount}
      onApplyTotalDiscount={setTotalDiscount}
      subtotal={calculateSubtotal()}
      itemsDiscount={calculateItemsDiscount()}
      total={calculateTotal()}
      onProcessSale={handleProcessSale}
      sheet={sheet}
    />
  );

  return (
    <>
      {/* h-full toma el alto real de <main>; cada columna queda acotada a
          ese alto (min-h-0 + overflow-hidden) y scrollea por dentro, así la
          búsqueda, el encabezado del carrito y los totales nunca se pierden. */}
      <div className="flex h-full min-h-0 flex-col lg:flex-row">
        {/* Grid de Productos: ocupa todo lo que deja el carrito en
            pantallas chicas; 70% a la izquierda en grandes. */}
        <div className="min-h-0 flex-1 overflow-hidden lg:w-[70%] lg:flex-none lg:border-r">
          <ProductGrid
            products={products}
            onAddToCart={handleAddToCart}
          />
        </div>

        {/* Carrito en pantallas grandes: columna derecha (30%). */}
        <div className="hidden min-h-0 overflow-hidden lg:block lg:w-[30%]">
          {renderCart()}
        </div>

        {/* Carrito en celular/tablet: hoja abajo. Plegada es sólo la barra
            con el total y Cobrar; desplegada sube hasta el 85% del alto
            para ver el carrito completo. */}
        <motion.div
          layout
          transition={{ type: "spring", bounce: 0.1, duration: 0.35 }}
          className={cn(
            "min-h-0 shrink-0 overflow-hidden border-t shadow-[0_-4px_12px_rgba(0,0,0,0.06)] lg:hidden",
            isCartExpanded && "h-[85%]"
          )}
        >
          {renderCart({
            expanded: isCartExpanded,
            onToggle: () => setIsCartExpanded((v) => !v),
          })}
        </motion.div>
      </div>

      {/* Modal de venta completada */}
      <SaleCompleteModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        sale={lastSale}
      />
    </>
  );
}
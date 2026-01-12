// app/(admin)/admin/dashboard/pos/page.tsx
"use client";

import * as React from "react";
import { DashboardContext } from "../layout";
import { type CartItem, type PaymentMethod, type Discount } from "@/lib/data";
import { ProductGrid } from "./_components/product-grid";
import { Cart } from "./_components/cart";
import { SaleCompleteModal } from "./_components/sale-complete-modal";

export default function POSPage() {
  const { products, setProducts, sales, setSales } = React.useContext(DashboardContext);
  
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [totalDiscount, setTotalDiscount] = React.useState<Discount | undefined>();
  const [showCompleteModal, setShowCompleteModal] = React.useState(false);
  const [lastSaleId, setLastSaleId] = React.useState<string>("");

  // Agregar producto al carrito
  const handleAddToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product || product.status === "Apartado") return;
    if (product.quantity <= 0) return;

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === productId);
      
      if (existingItem) {
        // Si ya existe, incrementar cantidad (verificar stock)
        if (existingItem.quantity >= product.quantity) {
          return prevCart; // No agregar más si no hay stock
        }
        return prevCart.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Si no existe, agregarlo
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
    if (quantity > product.quantity) return; // No permitir más del stock

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

  // Procesar venta
  const handleProcessSale = (paymentMethod: PaymentMethod) => {
    if (cart.length === 0) return;

    // Crear la venta
    const saleId = `sale-${Date.now()}`;
    const newSale = {
      id: saleId,
      date: new Date().toISOString(),
      items: cart.map((item) => {
        const itemTotal = item.product.price * item.quantity;
        let itemDiscount = 0;
        
        if (item.discount) {
          if (item.discount.type === "percentage") {
            itemDiscount = itemTotal * (item.discount.value / 100);
          } else {
            itemDiscount = item.discount.value;
          }
        }

        return {
          productId: item.product.id,
          productTitle: item.product.title,
          quantity: item.quantity,
          unitPrice: item.product.price,
          discount: item.discount,
          subtotal: itemTotal - itemDiscount,
        };
      }),
      totalDiscount,
      total: calculateTotal(),
      paymentMethod,
    };

    // Actualizar stock de productos
    setProducts((prevProducts) =>
      prevProducts.map((product) => {
        const cartItem = cart.find((item) => item.product.id === product.id);
        if (cartItem) {
          return {
            ...product,
            quantity: product.quantity - cartItem.quantity,
          };
        }
        return product;
      })
    );

    // Guardar venta
    setSales((prevSales) => [newSale, ...prevSales]);

    // Mostrar modal de confirmación
    setLastSaleId(saleId);
    setShowCompleteModal(true);

    // Limpiar carrito
    setCart([]);
    setTotalDiscount(undefined);
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

  return (
    <>
      <div className="flex h-full">
        {/* Columna Izquierda - Grid de Productos (70%) */}
        <div className="w-[70%] border-r">
          <ProductGrid
            products={products}
            onAddToCart={handleAddToCart}
          />
        </div>

        {/* Columna Derecha - Carrito (30%) */}
        <div className="w-[30%]">
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
          />
        </div>
      </div>

      {/* Modal de venta completada */}
      <SaleCompleteModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        saleId={lastSaleId}
        sale={sales.find((s) => s.id === lastSaleId)}
      />
    </>
  );
}
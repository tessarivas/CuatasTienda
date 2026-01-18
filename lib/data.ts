// lib/data.ts - VERSIÓN INTEGRADA CON TU SISTEMA

// 1. Definición de Tipos

export type Supplier = {
  id: string;
  providerName: string;
  businessName: string;
  logo: string;
  phone: string;
  email: string;
  cutoffDay: number; // Día del mes para el corte (1-31)
};

export type ProductStatus = "Disponible" | "Apartado" | "Vendido";

export type Product = {
  id: string;
  supplierId: string;
  photoUrl: string;
  title: string;
  price: number;
  quantity: number;
  status: ProductStatus;
  clientId?: string | null;
  barcode?: string; // NUEVO: Opcional para búsqueda en POS
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  balance: number;
};

// Tipos para transacciones (tu sistema existente)
export type TransactionType = "abono" | "liquidacion";

export type Transaction = {
  id: string;
  clientId: string;
  type: TransactionType;
  amount: number;
  date: string;
  details: string;
};

// NUEVOS: Tipos para el sistema POS
export type PaymentMethod = "Efectivo" | "Tarjeta" | "Transferencia";

export type DiscountType = "percentage" | "fixed";

export type Discount = {
  type: DiscountType;
  value: number;
};

export type CartItem = {
  product: Product;
  quantity: number;
  discount?: Discount;
};

export type Sale = {
  id: string;
  date: string; // ISO string
  items: {
    productId: string;
    productTitle: string;
    quantity: number;
    unitPrice: number;
    discount?: Discount;
    subtotal: number;
  }[];
  totalDiscount?: Discount;
  total: number;
  paymentMethod: PaymentMethod;
  clientId?: string; // Opcional para futuro
};

// 2. Datos de Prueba (Mock Data)

export const initialClients: Client[] = [
  {
    id: "cli-1",
    name: "Tessa Rivas",
    phone: "333-444-5555",
    balance: 500.0,
  },
  {
    id: "cli-2",
    name: "Carmelita",
    phone: "111-222-3333",
    balance: 1500.0,
  },
  {
    id: "cli-3",
    name: "Andrea Rivas",
    phone: "777-888-9999",
    balance: 0,
  },
];

export const initialTransactions: Transaction[] = [
  {
    id: "txn-1",
    clientId: "cli-1",
    type: "abono",
    amount: 500,
    date: new Date().toLocaleDateString("es-MX"),
    details: "Abono inicial a cuenta",
  },
  {
    id: "txn-2",
    clientId: "cli-2",
    type: "abono",
    amount: 1500,
    date: new Date().toLocaleDateString("es-MX"),
    details: "Abono para apartado de bolsa",
  },
];

export const initialSuppliers: Supplier[] = [
  {
    id: "1",
    providerName: "Maribel Barrón",
    businessName: "Básica Boutique",
    logo: "/suppliers/BASICA-BOUTIQUE-LOGO.jpg",
    phone: "123-456-7890",
    email: "maribel.barron@basica.com",
    cutoffDay: 25, // Día de corte añadido
  },
  {
    id: "2",
    providerName: "Alejandra Gómez",
    businessName: "CIIA",
    logo: "/suppliers/CIIA-LOGO.jpg",
    phone: "098-765-4321",
    email: "alejandra.gomez@ciia.com",
    cutoffDay: 1, // Día de corte añadido
  },
  {
    id: "3",
    providerName: "Elizabeth",
    businessName: "Eli´s Home",
    logo: "/suppliers/ELIS-HOME-LOGO.jpg",
    phone: "555-555-5555",
    email: "elizabeth@elishome.com",
    cutoffDay: 15, // Día de corte añadido
  },
];

export const initialProducts: Product[] = [
  {
    id: "prod-001",
    supplierId: "1",
    photoUrl: "/products/blusa-blanca.jpg",
    title: "Blusa Blanca de Lino",
    price: 750.0,
    quantity: 15,
    status: "Disponible",
    barcode: "7501234567890",
  },
  {
    id: "prod-002",
    supplierId: "2",
    photoUrl: "/products/bolso-piel.jpg",
    title: "Bolso de Piel Genuina",
    price: 1200.5,
    quantity: 8,
    status: "Disponible",
    barcode: "7501234567891",
  },
  {
    id: "prod-003",
    supplierId: "1",
    photoUrl: "/products/pantalon-mezclilla.jpg",
    title: "Pantalón de Mezclilla",
    price: 980.0,
    quantity: 1,
    status: "Apartado",
    clientId: "cli-1",
    barcode: "7501234567892",
  },
  {
    id: "prod-004",
    supplierId: "3",
    photoUrl: "/products/vela-aromatica.jpg",
    title: "Vela Aromática de Lavanda",
    price: 350.0,
    quantity: 25,
    status: "Disponible",
    barcode: "7501234567893",
  },
  // Productos adicionales para probar el POS
  {
    id: "prod-005",
    supplierId: "1",
    photoUrl: "/products/falda-rosa.jpg",
    title: "Falda Rosa Floral",
    price: 650.0,
    quantity: 12,
    status: "Disponible",
    barcode: "7501234567894",
  },
  {
    id: "prod-006",
    supplierId: "2",
    photoUrl: "/products/cartera.jpg",
    title: "Cartera de Mano",
    price: 890.0,
    quantity: 5,
    status: "Disponible",
    barcode: "7501234567895",
  },
];

// NUEVO: Array inicial de ventas (vacío al inicio)
export const initialSales: Sale[] = [];
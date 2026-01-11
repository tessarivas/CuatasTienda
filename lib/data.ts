// Este archivo simulará nuestra base de datos para el desarrollo frontend.

// 1. Definición de Tipos

export type Supplier = {
  id: string;
  providerName: string;
  businessName: string;
  logo: string;
  phone: string;
  email: string;
};

export type ProductStatus = "Disponible" | "Apartado";

export type Product = {
  id: string;
  supplierId: string; // Relación con el proveedor
  photoUrl: string;
  title: string;
  price: number;
  quantity: number;
  status: ProductStatus;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
};


// 2. Datos de Prueba (Mock Data)

export const initialClients: Client[] = [
  {
    id: "cli-1",
    name: "Tessa Rivas",
    phone: "333-444-5555",
  },
  {
    id: "cli-2",
    name: "Carmelita",
    phone: "111-222-3333",
  },
  {
    id: "cli-3",
    name: "Andrea Rivas",
    phone: "777-888-9999",
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
  },
  {
    id: "2",
    providerName: "Alejandra Gómez",
    businessName: "CIIA",
    logo: "/suppliers/CIIA-LOGO.jpg",
    phone: "098-765-4321",
    email: "alejandra.gomez@ciia.com",
  },
  {
    id: "3",
    providerName: "Elizabeth",
    businessName: "Eli´s Home",
    logo: "/suppliers/ELIS-HOME-LOGO.jpg",
    phone: "555-555-5555",
    email: "elizabeth@elishome.com",
  },
];

export const initialProducts: Product[] = [
    {
        id: "prod-001",
        supplierId: "1", // Básica Boutique
        photoUrl: "/products/blusa-blanca.jpg", // Necesitarás añadir imágenes de prueba en public/products
        title: "Blusa Blanca de Lino",
        price: 750.00,
        quantity: 15,
        status: "Disponible",
    },
    {
        id: "prod-002",
        supplierId: "2", // CIIA
        photoUrl: "/products/bolso-piel.jpg",
        title: "Bolso de Piel Genuina",
        price: 1200.50,
        quantity: 8,
        status: "Disponible",
    },
    {
        id: "prod-003",
        supplierId: "1", // Básica Boutique
        photoUrl: "/products/pantalon-mezclilla.jpg",
        title: "Pantalón de Mezclilla",
        price: 980.00,
        quantity: 1,
        status: "Apartado",
    },
    {
        id: "prod-004",
        supplierId: "3", // Eli´s Home
        photoUrl: "/products/vela-aromatica.jpg",
        title: "Vela Aromática de Lavanda",
        price: 350.00,
        quantity: 25,
        status: "Disponible",
    },
];
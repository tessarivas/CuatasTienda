import Image from "next/image";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { type Supplier } from "@/lib/data"; 

interface SupplierCardProps {
  supplier: Supplier;
  onClick: () => void;
}

export function SupplierCard({ supplier, onClick }: SupplierCardProps) {
  return (
    <Card
      onClick={onClick}
      className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow cursor-pointer py-0 gap-0"
    >
      <CardHeader className="flex items-center justify-center p-4">
        <Image
          src={supplier.logo}
          alt={`Logo de ${supplier.businessName}`}
          width={120}
          height={120}
          className="object-cover aspect-square"
        />
      </CardHeader>
      <CardFooter className="justify-center text-center bg-stone-100 p-2">
        <p className="text-lg font-semibold truncate">{supplier.businessName}</p>
      </CardFooter>
    </Card>
  );
}

export { Supplier };

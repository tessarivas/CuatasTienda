import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { type Supplier } from "@/lib/data";
import { Package } from "lucide-react";

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
      <CardContent className="p-4 pt-6 flex flex-col items-center justify-center gap-2 flex-1">
        {supplier.logo ? (
          <Image
            src={supplier.logo}
            alt={`Logo de ${supplier.businessName}`}
            width={96}
            height={96}
            className="object-cover aspect-square rounded-lg"
          />
        ) : (
          <div className="p-3 rounded-full bg-stone-200">
            <Package className="h-6 w-6 text-stone-600" />
          </div>
        )}
        <p className="text-lg font-semibold truncate w-full text-center">
          {supplier.businessName}
        </p>
      </CardContent>
      <CardFooter className="justify-center text-center bg-stone-100 p-2">
        <span className="text-sm text-muted-foreground truncate">
          {supplier.name}
        </span>
      </CardFooter>
    </Card>
  );
}

export { Supplier };

import { FadeInImage } from "../../_components/fade-in-image";
import { Card, CardFooter } from "@/components/ui/card";
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
      {/* La foto llena todo el espacio de arriba (recortada a 4:3). */}
      <div className="relative aspect-4/3 w-full bg-muted">
        {supplier.logo ? (
          <FadeInImage
            src={supplier.logo}
            alt={`Logo de ${supplier.businessName}`}
            fill
            sizes="(min-width: 768px) 25vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Sin logo
          </div>
        )}
      </div>
      <CardFooter className="justify-center text-center bg-stone-100 p-2">
        <p className="text-lg font-semibold truncate">{supplier.businessName}</p>
      </CardFooter>
    </Card>
  );
}

export { Supplier };

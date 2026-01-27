import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Client } from "@/lib/data";
import { User } from "lucide-react";

interface ClientCardProps {
  client: Client;
  onClick: () => void;
}

export function ClientCard({ client, onClick }: ClientCardProps) {
  const hasBalance = client.balance > 0;

  return (
    <Card
      onClick={onClick}
      className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow cursor-pointer py-0 gap-0"
    >
      <CardContent className="p-4 pt-6 flex flex-col items-center justify-center gap-2 flex-1">
        {/* Avatar con icono */}
        <div className="relative">
          <div className="p-3 rounded-full bg-stone-200">
            <User className="h-6 w-6 text-stone-600" />
          </div>
          {hasBalance && (
            <div className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </div>

        {/* Nombre del cliente */}
        <p className="text-xl font-semibold truncate">{client.name}</p>
      </CardContent>
      <CardFooter className="justify-center text-center bg-stone-100 p-2">
        {/* Badge de saldo */}
        {hasBalance ? (
          <Badge
            variant="secondary"
            className="text-sm"
          >
            Abono: ${client.balance.toLocaleString()}
          </Badge>
        ) : (
          <span className="text-sm text-stone-500">Sin abonar</span>
        )}
      </CardFooter>
    </Card>
  );
}
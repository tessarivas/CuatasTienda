import { Card } from "@/components/ui/card";
import { type Client } from "@/lib/data";

interface ClientCardProps {
  client: Client;
  onClick: () => void;
}

export function ClientCard({ client, onClick }: ClientCardProps) {
  return (
    <Card
      onClick={onClick}
      className="flex items-center justify-center p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <p className="text-lg font-semibold text-center truncate w-full">
        {client.name}
      </p>
    </Card>
  );
}
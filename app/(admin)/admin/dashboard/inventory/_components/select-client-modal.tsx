"use client";

import * as React from "react";
import { type Client } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SelectClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Aparta el producto para ese cliente. Devuelve true si se apartó (el
  // padre cierra el modal); con false el modal se queda abierto para
  // reintentar. Mientras tanto el botón muestra "Apartando...".
  onSelectClient: (client: Client) => Promise<boolean>;
  clients: Client[];
  // Producto que se va a apartar, para el subtítulo.
  productTitle?: string;
}

export function SelectClientModal({
  isOpen,
  onClose,
  onSelectClient,
  clients,
  productTitle,
}: SelectClientModalProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [assigningId, setAssigningId] = React.useState<string | null>(null);

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectClick = async (client: Client) => {
    if (assigningId) return;
    setAssigningId(client.id);
    try {
      await onSelectClient(client);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    // Mientras se aparta no se puede cerrar (ni con Esc ni clic afuera).
    <Dialog open={isOpen} onOpenChange={() => !assigningId && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Apartar para un cliente
          </DialogTitle>
          {productTitle && (
            <DialogDescription className="truncate">{productTitle}</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Input
            placeholder="Buscar cliente por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="border rounded-lg max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Teléfono</TableCell>
                  <TableCell className="w-[120px]"></TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        {client.name}
                      </TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          className="cursor-pointer"
                          disabled={!!assigningId}
                          onClick={() => handleSelectClick(client)}
                        >
                          {assigningId === client.id && (
                            <Loader2 className="animate-spin" />
                          )}
                          {assigningId === client.id ? "Apartando..." : "Seleccionar"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No se encontraron clientes.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={!!assigningId}
            onClick={onClose}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
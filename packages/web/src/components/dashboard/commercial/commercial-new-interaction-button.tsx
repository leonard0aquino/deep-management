"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InteractionFormDialog } from "@/components/dashboard/registros/interaction-form-dialog";
import type { Client, ClientContact, ClientProduct, ClientProductOwner, DeepManager, Product } from "@/lib/types/database";

export function CommercialNewInteractionButton({ clients, products, managers, contacts, clientProducts, clientProductOwners }: {
  clients: Client[];
  products: Product[];
  managers: DeepManager[];
  contacts: ClientContact[];
  clientProducts: ClientProduct[];
  clientProductOwners: ClientProductOwner[];
}) {
  const [open, setOpen] = useState(false);
  return <><Button size="sm" onClick={() => setOpen(true)}><Plus /> Nova interação</Button><InteractionFormDialog open={open} onOpenChange={setOpen} clients={clients} products={products} managers={managers} contacts={contacts} clientProducts={clientProducts} clientProductOwners={clientProductOwners} editing={null} restrictToAssignedPortfolio={false} /></>;
}

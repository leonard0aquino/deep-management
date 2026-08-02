"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InteractionFormDialog } from "@/components/dashboard/registros/interaction-form-dialog";
import type { DashboardData } from "@/lib/data";

export function NewInteractionButton({
  data,
  restrictToAssignedPortfolio = false,
}: {
  data: DashboardData;
  restrictToAssignedPortfolio?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nova interação
      </Button>
      <InteractionFormDialog
        open={open}
        onOpenChange={setOpen}
        clients={data.clients}
        products={data.products}
        managers={data.managers}
        contacts={data.contacts}
        clientProducts={data.clientProducts}
        clientProductOwners={data.clientProductOwners}
        editing={null}
        restrictToAssignedPortfolio={restrictToAssignedPortfolio}
      />
    </>
  );
}

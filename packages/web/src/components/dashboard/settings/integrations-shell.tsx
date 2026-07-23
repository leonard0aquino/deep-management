import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MessageSquare, Mail } from "lucide-react";

const INTEGRATIONS = [
  { name: "Google Calendar", icon: Calendar, description: "Sincronizar reuniões automaticamente" },
  { name: "Slack", icon: MessageSquare, description: "Alertas de risco no canal do time" },
  { name: "Email", icon: Mail, description: "Registrar e-mails como interações" },
];

export function IntegrationsShell() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrações</CardTitle>
        <CardDescription>
          Nenhuma integração conectada ainda — requer credenciais reais de cada serviço
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {INTEGRATIONS.map((integration) => (
          <div key={integration.name} className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <integration.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{integration.name}</p>
                <p className="text-xs text-muted-foreground">{integration.description}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>
              Em breve
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

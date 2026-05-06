import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Client } from "@/hooks/useClients";
import { useLeads } from "@/hooks/useLeads";
import { Users, Building2, Loader2 } from "lucide-react";
import { LinkedInAdsTab } from "@/components/LinkedInAdsTab";

interface TrafegoClientDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


export function TrafegoClientDialog({
  client,
  open,
  onOpenChange,
}: TrafegoClientDialogProps) {
  const { data: leads, isLoading } = useLeads(client?.id || null);

  if (!client) return null;

  const allLeads = leads || [];
  const totalLeads = allLeads.reduce((sum, l) => sum + l.lead_count, 0);
  const linkedinLeads = allLeads
    .filter((l) => l.platform === "linkedin")
    .reduce((sum, l) => sum + l.lead_count, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            {client.image_url ? (
              <img
                src={client.image_url}
                alt={client.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                {client.name.charAt(0)}
              </div>
            )}
            <div>
              <span>{client.name}</span>
              {client.niche && (
                <Badge variant="secondary" className="ml-2 font-normal">
                  {client.niche}
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6 mt-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Total Leads</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{totalLeads}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm">LinkedIn</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: "#0A66C2" }}>
                  {linkedinLeads}
                </p>
              </Card>
            </div>

            {/* LinkedIn Ads */}
            <LinkedInAdsTab clientId={client.id} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import { Client } from "@/types/client";

interface ClientCircleProps {
  client?: Client;
  onClick?: () => void;
  isSelected?: boolean;
}

export const ClientCircle = ({ client, onClick, isSelected }: ClientCircleProps) => {
  const hasClient = !!client?.name;

  return (
    <button
      onClick={onClick}
      disabled={!hasClient}
      className={cn(
        "relative w-16 h-16 md:w-20 md:h-20 rounded-full transition-all duration-300 ease-out",
        "border-2 overflow-hidden flex items-center justify-center",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
        hasClient
          ? "border-primary/30 bg-card hover:border-primary hover:scale-110 hover:shadow-client cursor-pointer"
          : "border-dashed border-muted-foreground/20 bg-muted/30 cursor-default",
        isSelected && "ring-2 ring-primary ring-offset-2 scale-110 shadow-client"
      )}
    >
      {client?.image ? (
        <img
          src={client.image}
          alt={client.name}
          className="w-full h-full object-cover"
        />
      ) : hasClient ? (
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/40 flex items-center justify-center">
          <span className="text-lg md:text-xl font-semibold text-primary">
            {client.name.charAt(0).toUpperCase()}
          </span>
        </div>
      ) : (
        <User className="w-6 h-6 text-muted-foreground/30" />
      )}
    </button>
  );
};

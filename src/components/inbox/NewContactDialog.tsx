import { useState } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateContact } from "@/hooks/useInbox";
import { toast } from "sonner";

interface NewContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (conversationId: string, contactId: string) => void;
}

const phoneSchema = z.string().min(10, "Telefone inválido").max(15, "Telefone inválido");

export const NewContactDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: NewContactDialogProps) => {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const createContact = useCreateContact();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      phoneSchema.parse(phone);
    } catch {
      setError("Por favor, insira um telefone válido");
      return;
    }

    try {
      const result = await createContact.mutateAsync({
        phone: phone.trim(),
        name: name.trim() || undefined,
      });
      toast.success("Contato criado com sucesso!");
      onSuccess(result.conversation.id, result.contact.id);
      setPhone("");
      setName("");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao criar contato";
      if (errorMessage.includes("duplicate")) {
        setError("Este telefone já está cadastrado");
      } else {
        setError("Erro ao criar contato. Tente novamente.");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Contato</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="phone">Telefone (WhatsApp) *</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+55 11 99999-9999"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do contato"
              className="mt-1"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createContact.isPending}>
              {createContact.isPending ? "Criando..." : "Criar Contato"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

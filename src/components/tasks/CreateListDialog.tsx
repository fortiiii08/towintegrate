import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCreateList } from "@/hooks/useTasks";

interface CreateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string | null;
}

export function CreateListDialog({ open, onOpenChange, spaceId }: CreateListDialogProps) {
  const [name, setName] = useState("");
  const createList = useCreateList();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !spaceId) return;

    createList.mutate(
      { name, space_id: spaceId },
      {
        onSuccess: () => {
          setName("");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Lista</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Sprint 1, Backlog, Campanhas"
              autoFocus
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Status padrão serão criados: A Fazer, Em Progresso, Em Revisão, Concluído
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || createList.isPending}>
              {createList.isPending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Tarefa = Tables<"tarefas">;

interface TarefaComAluno extends Tarefa {
  aluno: {
    nome_completo: string;
    email: string;
  } | null;
}

interface MarcarEntregueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefa: TarefaComAluno;
  onSubmit: (urlPdf: string) => void;
  isSubmitting: boolean;
}

export function MarcarEntregueDialog({
  open,
  onOpenChange,
  tarefa,
  onSubmit,
  isSubmitting,
}: MarcarEntregueDialogProps) {
  const [urlPdf, setUrlPdf] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlPdf.trim()) {
      onSubmit(urlPdf.trim());
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setUrlPdf("");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Marcar Tarefa como Entregue</DialogTitle>
            <DialogDescription>
              Registre a entrega da tarefa pelo aluno
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título da Tarefa</Label>
              <Input value={tarefa.titulo} disabled />
            </div>

            <div className="space-y-2">
              <Label>Aluno</Label>
              <Input value={tarefa.aluno?.nome_completo || "N/A"} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url_pdf">URL do PDF Entregue *</Label>
              <Input
                id="url_pdf"
                type="url"
                placeholder="https://drive.google.com/..."
                value={urlPdf}
                onChange={(e) => setUrlPdf(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Cole o link do arquivo (Google Drive, Dropbox, etc.)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !urlPdf.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Marcar como Entregue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

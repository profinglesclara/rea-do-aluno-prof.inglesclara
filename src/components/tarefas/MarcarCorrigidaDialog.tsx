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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Tarefa = Tables<"tarefas">;

interface TarefaComAluno extends Tarefa {
  aluno: {
    nome_completo: string;
    email: string;
  } | null;
}

interface MarcarCorrigidaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefa: TarefaComAluno;
  onSubmit: (feedbackProfessor: string, urlPdfCorrigido?: string) => void;
  isSubmitting: boolean;
}

export function MarcarCorrigidaDialog({
  open,
  onOpenChange,
  tarefa,
  onSubmit,
  isSubmitting,
}: MarcarCorrigidaDialogProps) {
  const [urlPdfCorrigido, setUrlPdfCorrigido] = useState("");
  const [feedbackProfessor, setFeedbackProfessor] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedbackProfessor.trim()) {
      setError("O campo de observações do professor é obrigatório.");
      return;
    }
    
    setError("");
    onSubmit(feedbackProfessor.trim(), urlPdfCorrigido.trim() || undefined);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setUrlPdfCorrigido("");
        setFeedbackProfessor("");
        setError("");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Marcar Tarefa como Corrigida</DialogTitle>
            <DialogDescription>
              Registre a correção da tarefa e adicione suas observações
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
              <Label htmlFor="feedback_professor" className="flex items-center gap-1">
                Observações do Professor <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="feedback_professor"
                placeholder="Escreva aqui suas observações sobre a tarefa corrigida..."
                value={feedbackProfessor}
                onChange={(e) => {
                  setFeedbackProfessor(e.target.value);
                  if (error) setError("");
                }}
                disabled={isSubmitting}
                className="min-h-[100px]"
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="url_pdf_corrigido">URL do PDF Corrigido (opcional)</Label>
              <Input
                id="url_pdf_corrigido"
                type="url"
                placeholder="https://drive.google.com/..."
                value={urlPdfCorrigido}
                onChange={(e) => setUrlPdfCorrigido(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Se houver um arquivo corrigido, cole o link aqui
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Correção
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
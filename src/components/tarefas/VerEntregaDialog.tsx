import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Entrega {
  id: string;
  tarefa_id: string;
  aluno_id: string;
  url_pdf: string;
  data_envio: string;
}

interface TarefaComAluno {
  id: string;
  titulo: string;
  aluno: {
    nome_completo: string;
  } | null;
}

interface VerEntregaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefa: TarefaComAluno | null;
  entrega: Entrega | null;
}

export function VerEntregaDialog({
  open,
  onOpenChange,
  tarefa,
  entrega,
}: VerEntregaDialogProps) {
  if (!tarefa || !entrega) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Entrega da Tarefa</DialogTitle>
          <DialogDescription>
            Visualize os detalhes da entrega do aluno
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label className="text-muted-foreground">Tarefa</Label>
            <p className="mt-1 font-medium">{tarefa.titulo}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Aluno</Label>
            <p className="mt-1">{tarefa.aluno?.nome_completo || "N/A"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Data de envio</Label>
            <p className="mt-1">
              {format(parseISO(entrega.data_envio), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Arquivo enviado</Label>
            <div className="mt-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={entrega.url_pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir PDF
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

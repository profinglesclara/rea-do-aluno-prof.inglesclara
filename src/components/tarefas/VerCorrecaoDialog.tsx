import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ExternalLink, FileText, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VerCorrecaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefa: {
    titulo: string;
    feedback_professor?: string | null;
  } | null;
  entrega: {
    url_pdf: string;
    data_envio: string;
  } | null;
}

// Helper para parsear múltiplas URLs
function parseUrls(urlString: string): string[] {
  if (!urlString) return [];
  
  return urlString
    .split(',')
    .map(url => url.trim())
    .filter(url => url.length > 0 && url.startsWith('http'));
}

// Helper para extrair nome do arquivo da URL
function getFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const decodedName = decodeURIComponent(fileName);
    const withoutTimestamp = decodedName.replace(/^\d+_/, '');
    return withoutTimestamp || fileName;
  } catch {
    return url.split('/').pop() || 'arquivo.pdf';
  }
}

export function VerCorrecaoDialog({
  open,
  onOpenChange,
  tarefa,
  entrega,
}: VerCorrecaoDialogProps) {
  if (!tarefa) return null;

  const arquivos = entrega ? parseUrls(entrega.url_pdf) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            Correção da Tarefa
          </DialogTitle>
          <DialogDescription>
            Feedback do professor sobre sua entrega
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label className="text-muted-foreground text-sm">Tarefa</Label>
            <p className="mt-1 font-medium">{tarefa.titulo}</p>
          </div>

          {entrega && (
            <div>
              <Label className="text-muted-foreground text-sm">Data de envio</Label>
              <p className="mt-1">
                {format(parseISO(entrega.data_envio), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </p>
            </div>
          )}

          {tarefa.feedback_professor && (
            <div>
              <Label className="text-muted-foreground text-sm">Observações do Professor</Label>
              <div className="mt-2 p-4 rounded-lg border bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                <p className="text-sm whitespace-pre-wrap">{tarefa.feedback_professor}</p>
              </div>
            </div>
          )}

          {arquivos.length > 0 && (
            <div>
              <Label className="text-muted-foreground text-sm">
                Arquivos enviados ({arquivos.length})
              </Label>
              <div className="mt-2 space-y-2">
                {arquivos.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-sm truncate" title={getFileNameFromUrl(url)}>
                        {getFileNameFromUrl(url)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="shrink-0 ml-2"
                    >
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

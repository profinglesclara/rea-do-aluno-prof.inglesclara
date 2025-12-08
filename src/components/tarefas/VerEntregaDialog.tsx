import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ExternalLink, FileText, Download } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Entrega {
  id: string;
  tarefa_id: string;
  aluno_id: string;
  url_pdf: string;
  data_envio: string;
  comentario?: string | null;
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

// Helper para extrair nome do arquivo da URL
function getFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    // Decodificar URL e remover prefixo de timestamp se houver
    const decodedName = decodeURIComponent(fileName);
    // Remove timestamp prefix (formato: 1234567890123_)
    const withoutTimestamp = decodedName.replace(/^\d+_/, '');
    return withoutTimestamp || fileName;
  } catch {
    return url.split('/').pop() || 'arquivo.pdf';
  }
}

// Helper para parsear múltiplas URLs
function parseUrls(urlString: string): string[] {
  if (!urlString) return [];
  
  // URLs podem estar separadas por vírgula
  return urlString
    .split(',')
    .map(url => url.trim())
    .filter(url => url.length > 0 && url.startsWith('http'));
}

export function VerEntregaDialog({
  open,
  onOpenChange,
  tarefa,
  entrega,
}: VerEntregaDialogProps) {
  if (!tarefa || !entrega) return null;

  const arquivos = parseUrls(entrega.url_pdf);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Entrega da Tarefa</DialogTitle>
          <DialogDescription>
            Visualize os arquivos enviados pelo aluno
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-sm">Tarefa</Label>
              <p className="mt-1 font-medium">{tarefa.titulo}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Aluno</Label>
              <p className="mt-1">{tarefa.aluno?.nome_completo || "N/A"}</p>
            </div>
          </div>
          
          <div>
            <Label className="text-muted-foreground text-sm">Data de envio</Label>
            <p className="mt-1">
              {format(parseISO(entrega.data_envio), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </p>
          </div>

          {entrega.comentario && (
            <div>
              <Label className="text-muted-foreground text-sm">Comentário do aluno</Label>
              <p className="mt-1 p-3 rounded-lg border bg-muted/30 text-sm whitespace-pre-wrap">
                {entrega.comentario}
              </p>
            </div>
          )}

          <div>
            <Label className="text-muted-foreground text-sm">
              Arquivos enviados ({arquivos.length})
            </Label>
            
            {arquivos.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhum arquivo encontrado nesta entrega.
              </p>
            ) : (
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
                    <div className="flex gap-1 shrink-0 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8 px-2"
                      >
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir em nova aba"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8 px-2"
                      >
                        <a
                          href={url}
                          download
                          title="Baixar arquivo"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, FileText, Loader2, ExternalLink } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AlunoTarefaDetalhes() {
  const { tarefa_id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Buscar aluno
  const { data: aluno } = useQuery({
    queryKey: ["alunoTeste"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("tipo_usuario", "Aluno")
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar tarefa
  const { data: tarefa, isLoading: tarefaLoading } = useQuery({
    queryKey: ["tarefa", tarefa_id, aluno?.user_id],
    enabled: !!tarefa_id && !!aluno?.user_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarefas")
        .select("*")
        .eq("id", tarefa_id!)
        .eq("aluno_id", aluno!.user_id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar entrega (se existir)
  const { data: entrega } = useQuery({
    queryKey: ["entrega", tarefa_id, aluno?.user_id],
    enabled: !!tarefa_id && !!aluno?.user_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entregas_tarefas")
        .select("*")
        .eq("tarefa_id", tarefa_id!)
        .eq("aluno_id", aluno!.user_id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar admin para notificação
  const { data: admin } = useQuery({
    queryKey: ["admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("tipo_usuario", "Admin")
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const enviarTarefaMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!aluno || !tarefa || !admin) throw new Error("Dados incompletos");

      // 1. Upload do arquivo
      const fileName = `${aluno.user_id}/${tarefa.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("tarefas")
        .upload(fileName, file, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from("tarefas")
        .getPublicUrl(fileName);

      // 2. Registrar/atualizar entrega
      if (entrega) {
        // Atualizar entrega existente
        const { error: updateError } = await supabase
          .from("entregas_tarefas")
          .update({
            url_pdf: publicUrl,
            data_envio: new Date().toISOString(),
          })
          .eq("id", entrega.id);

        if (updateError) throw updateError;
      } else {
        // Criar nova entrega
        const { error: insertError } = await supabase
          .from("entregas_tarefas")
          .insert({
            tarefa_id: tarefa.id,
            aluno_id: aluno.user_id,
            url_pdf: publicUrl,
          });

        if (insertError) throw insertError;
      }

      // 3. Atualizar status da tarefa
      const { error: tarefaError } = await supabase
        .from("tarefas")
        .update({ status: "Entregue" })
        .eq("id", tarefa.id);

      if (tarefaError) throw tarefaError;

      // 4. Criar notificação para admin
      const { error: notifError } = await supabase
        .from("notificacoes")
        .insert({
          usuario_id: admin.user_id,
          tipo: "TAREFA_ENTREGUE",
          titulo: "Nova tarefa entregue",
          mensagem: `O aluno ${aluno.nome_completo} enviou a tarefa "${tarefa.titulo}".`,
        });

      if (notifError) {
        console.error("Erro ao criar notificação:", notifError);
      }

      // 5. Enviar email para admin
      try {
        const emailHtml = `
          <h1>Nova Tarefa Entregue</h1>
          <p>Olá,</p>
          <p>O aluno <strong>${aluno.nome_completo}</strong> enviou a tarefa:</p>
          <h2>${tarefa.titulo}</h2>
          <p><strong>Data de envio:</strong> ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          <p>Acesse o painel administrativo para visualizar e corrigir a tarefa.</p>
        `;

        await supabase.functions.invoke("enviar-email-notificacao", {
          body: {
            to: admin.email,
            subject: `Nova tarefa entregue por ${aluno.nome_completo}`,
            html: emailHtml,
          },
        });
      } catch (emailError) {
        console.error("Erro ao enviar email:", emailError);
      }

      return publicUrl;
    },
    onSuccess: () => {
      toast({
        title: "Tarefa enviada com sucesso!",
        description: "Você será avisado quando ela for corrigida.",
      });
      queryClient.invalidateQueries({ queryKey: ["tarefa", tarefa_id] });
      queryClient.invalidateQueries({ queryKey: ["entrega", tarefa_id] });
      queryClient.invalidateQueries({ queryKey: ["tarefasAluno"] });
      setArquivo(null);
      setUploading(false);
    },
    onError: (error) => {
      console.error("Erro ao enviar tarefa:", error);
      toast({
        title: "Erro ao enviar tarefa",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
      setUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          title: "Arquivo inválido",
          description: "Apenas arquivos PDF são permitidos.",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive",
        });
        return;
      }
      setArquivo(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivo) {
      toast({
        title: "Selecione um arquivo",
        description: "Você precisa selecionar um PDF para enviar.",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    enviarTarefaMutation.mutate(arquivo);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      Pendente: "secondary",
      Entregue: "default",
      Corrigida: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (tarefaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!tarefa) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Tarefa não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/aluno/tarefas")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Detalhes da Tarefa</h1>
        </div>

        {/* Informações da tarefa */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle>{tarefa.titulo}</CardTitle>
              {getStatusBadge(tarefa.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {tarefa.descricao && (
              <div>
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="mt-1">{tarefa.descricao}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Tipo</Label>
                <p className="mt-1">
                  <Badge variant={tarefa.tipo === "Obrigatoria" ? "destructive" : "secondary"}>
                    {tarefa.tipo === "Obrigatoria" ? "Obrigatória" : "Sugerida"}
                  </Badge>
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Data de criação</Label>
                <p className="mt-1">
                  {format(parseISO(tarefa.criada_em), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              {tarefa.data_limite && (
                <div>
                  <Label className="text-muted-foreground">Data limite</Label>
                  <p className="mt-1">
                    {format(parseISO(tarefa.data_limite), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Entrega existente */}
        {entrega && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Sua Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Data de envio</Label>
                <p className="mt-1">
                  {format(parseISO(entrega.data_envio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Arquivo enviado</Label>
                <div className="mt-1">
                  <Button variant="outline" size="sm" asChild>
                    <a href={entrega.url_pdf} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir PDF
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulário de upload */}
        {tarefa.status === "Pendente" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Enviar Tarefa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="arquivo">Arquivo PDF</Label>
                  <Input
                    id="arquivo"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="mt-1"
                  />
                  {arquivo && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selecionado: {arquivo.name}
                    </p>
                  )}
                </div>
                <Button type="submit" disabled={uploading || !arquivo}>
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Enviar Tarefa
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {tarefa.status === "Corrigida" && (
          <Card className="border-green-500">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <Badge variant="outline" className="text-green-600">
                  ✓ Tarefa Corrigida
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Sua tarefa foi corrigida e está disponível para consulta.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

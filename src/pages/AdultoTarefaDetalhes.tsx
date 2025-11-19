import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdultoTarefaDetalhes() {
  const { tarefa_id } = useParams<{ tarefa_id: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/login");
        return;
      }

      const { data } = await supabase
        .from("usuarios")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!data || data.tipo_usuario !== "Adulto") {
        navigate("/login");
        return;
      }

      setCurrentUser(data);
      setLoading(false);
    };

    fetchCurrentUser();
  }, [navigate]);

  const { data: tarefa, refetch } = useQuery({
    queryKey: ["tarefaAdulto", tarefa_id],
    enabled: !!currentUser && !!tarefa_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarefas")
        .select("*")
        .eq("id", tarefa_id)
        .eq("aluno_id", currentUser.user_id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: entrega } = useQuery({
    queryKey: ["entregaTarefaAdulto", tarefa_id],
    enabled: !!tarefa_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entregas_tarefas")
        .select("*")
        .eq("tarefa_id", tarefa_id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tarefa) return;

    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF são permitidos.");
      return;
    }

    setUploading(true);
    try {
      const fileName = `${currentUser.user_id}/${tarefa.id}/${Date.now()}_${file.name}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("tarefas")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("tarefas")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("entregas_tarefas")
        .insert({
          tarefa_id: tarefa.id,
          aluno_id: currentUser.user_id,
          url_pdf: publicUrl,
        });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from("tarefas")
        .update({ status: "Entregue" })
        .eq("id", tarefa.id);

      if (updateError) throw updateError;

      toast.success("Tarefa entregue com sucesso!");
      refetch();
    } catch (error: any) {
      toast.error("Erro ao enviar tarefa: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!tarefa) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Tarefa não encontrada.</p>
            <Button onClick={() => navigate("/adulto/tarefas")} className="mt-4">
              Voltar para tarefas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/adulto/tarefas")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">{tarefa.titulo}</h1>
          </div>
          <NotificationBell userId={currentUser?.user_id || ""} />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Detalhes da Tarefa</CardTitle>
              <Badge
                variant={
                  tarefa.status === "Pendente"
                    ? "destructive"
                    : tarefa.status === "Entregue"
                    ? "default"
                    : "secondary"
                }
              >
                {tarefa.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Descrição</p>
              <p>{tarefa.descricao || "Sem descrição"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo</p>
              <Badge variant="outline">{tarefa.tipo}</Badge>
            </div>
            {tarefa.data_limite && (
              <div>
                <p className="text-sm text-muted-foreground">Prazo</p>
                <p>{format(new Date(tarefa.data_limite), "dd/MM/yyyy")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {entrega && (
          <Card>
            <CardHeader>
              <CardTitle>Entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Data de envio</p>
                <p>{format(new Date(entrega.data_envio), "dd/MM/yyyy HH:mm")}</p>
              </div>
              <a
                href={entrega.url_pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Baixar PDF enviado
              </a>
            </CardContent>
          </Card>
        )}

        {tarefa.status === "Pendente" && !entrega && (
          <Card>
            <CardHeader>
              <CardTitle>Enviar Tarefa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="pdf-upload">Arquivo PDF</Label>
                <Input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </div>
              {uploading && <p className="text-sm text-muted-foreground">Enviando...</p>}
            </CardContent>
          </Card>
        )}

        {tarefa.status === "Corrigida" && (
          <Card>
            <CardHeader>
              <CardTitle>Tarefa Corrigida</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">Corrigida pelo professor</Badge>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export default function AdultoTarefas() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const { data: tarefas } = useQuery({
    queryKey: ["tarefasAdulto", currentUser?.user_id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarefas")
        .select("*")
        .eq("aluno_id", currentUser.user_id)
        .order("criada_em", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  const tarefasObrigatorias = tarefas?.filter(t => t.tipo === "Obrigatoria") || [];
  const tarefasSugeridas = tarefas?.filter(t => t.tipo === "Sugerida") || [];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/adulto/dashboard")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">Minhas Tarefas</h1>
          </div>
          <NotificationBell userId={currentUser?.user_id || ""} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tarefas Obrigatórias</CardTitle>
          </CardHeader>
          <CardContent>
            {tarefasObrigatorias.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma tarefa obrigatória.</p>
            ) : (
              <div className="space-y-3">
                {tarefasObrigatorias.map((tarefa) => (
                  <div
                    key={tarefa.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{tarefa.titulo}</h3>
                      <p className="text-sm text-muted-foreground">
                        {tarefa.data_limite
                          ? `Prazo: ${format(new Date(tarefa.data_limite), "dd/MM/yyyy")}`
                          : "Sem prazo"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
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
                      <Button
                        onClick={() => navigate(`/adulto/tarefas/${tarefa.id}`)}
                        size="sm"
                      >
                        Ver detalhes
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarefas Sugeridas</CardTitle>
          </CardHeader>
          <CardContent>
            {tarefasSugeridas.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma tarefa sugerida.</p>
            ) : (
              <div className="space-y-3">
                {tarefasSugeridas.map((tarefa) => (
                  <div
                    key={tarefa.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{tarefa.titulo}</h3>
                      <p className="text-sm text-muted-foreground">
                        {tarefa.descricao || "Sem descrição"}
                      </p>
                    </div>
                    <Badge variant="outline">{tarefa.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

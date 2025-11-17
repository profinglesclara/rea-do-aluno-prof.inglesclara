import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { Calendar, ListTodo, Trophy, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function AdminNotificacoes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<"all" | "unread">("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [alunoFilter, setAlunoFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Buscar admin user
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  // Buscar admin na tabela usuarios
  const { data: admin } = useQuery({
    queryKey: ["adminUser", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("user_id", session!.user.id)
        .eq("tipo_usuario", "Admin")
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Buscar alunos para filtro
  const { data: alunos } = useQuery({
    queryKey: ["alunos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("user_id, nome_completo")
        .eq("tipo_usuario", "Aluno")
        .order("nome_completo");

      if (error) throw error;
      return data;
    },
  });

  const { notifications, markAsRead } = useNotifications(admin?.user_id);

  // Filtrar notificações
  const filteredNotifications = notifications.filter((n) => {
    if (statusFilter === "unread" && n.lida) return false;
    if (tipoFilter === "tarefas" && !n.tipo.startsWith("TAREFA_")) return false;
    if (tipoFilter === "aulas" && n.tipo !== "AULA_ATUALIZADA") return false;
    if (tipoFilter === "conquistas" && n.tipo !== "CONQUISTA_DESBLOQUEADA") return false;
    return true;
  });

  // Paginação
  const totalPages = Math.ceil(filteredNotifications.length / pageSize);
  const paginatedNotifications = filteredNotifications.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const getNotificationIcon = (tipo: Notification["tipo"]) => {
    if (tipo.startsWith("TAREFA_")) return <ListTodo className="h-5 w-5" />;
    if (tipo === "AULA_ATUALIZADA") return <Calendar className="h-5 w-5" />;
    if (tipo === "CONQUISTA_DESBLOQUEADA") return <Trophy className="h-5 w-5" />;
    return null;
  };

  const getNotificationBadgeVariant = (tipo: Notification["tipo"]) => {
    if (tipo.startsWith("TAREFA_")) return "default";
    if (tipo === "AULA_ATUALIZADA") return "secondary";
    if (tipo === "CONQUISTA_DESBLOQUEADA") return "outline";
    return "default";
  };

  const formatDate = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "Data inválida";
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId);
    toast({
      title: "Notificação marcada como lida",
    });
  };

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Notificações</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle>Todas as notificações</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="unread">Não lidas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="tarefas">Tarefas</SelectItem>
                    <SelectItem value="aulas">Aulas</SelectItem>
                    <SelectItem value="conquistas">Conquistas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={alunoFilter} onValueChange={setAlunoFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Todos os alunos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os alunos</SelectItem>
                    {alunos?.map((aluno) => (
                      <SelectItem key={aluno.user_id} value={aluno.user_id}>
                        {aluno.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {paginatedNotifications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {statusFilter === "unread"
                    ? "Você não tem notificações não lidas."
                    : "Você ainda não tem notificações."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                      !notification.lida
                        ? "bg-accent/50 border-accent-foreground/20"
                        : "hover:bg-accent/30"
                    }`}
                  >
                    <div className="mt-1">{getNotificationIcon(notification.tipo)}</div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`text-sm ${
                            !notification.lida ? "font-semibold" : "font-medium"
                          }`}
                        >
                          {notification.titulo}
                        </h3>
                        <Badge variant={getNotificationBadgeVariant(notification.tipo)}>
                          {notification.tipo.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.mensagem}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(notification.criada_em)}
                        </p>
                        {!notification.lida && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            Marcar como lida
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Página {page} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Notification = {
  id: string;
  usuario_id: string;
  tipo: "TAREFA_NOVA" | "TAREFA_ENTREGUE" | "TAREFA_CORRIGIDA" | "AULA_ATUALIZADA" | "CONQUISTA_DESBLOQUEADA";
  titulo: string;
  mensagem: string;
  lida: boolean;
  criada_em: string;
};

export function useNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("usuario_id", userId!)
        .order("criada_em", { ascending: false });

      if (error) throw error;
      return data as Notification[];
    },
  });

  const unreadCount = notifications.filter((n) => !n.lida).length;

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsRead.mutate,
  };
}

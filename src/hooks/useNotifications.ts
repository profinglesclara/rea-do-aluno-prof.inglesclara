import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export type Notification = {
  id: string;
  usuario_id: string;
  tipo: "TAREFA_NOVA" | "TAREFA_ENTREGUE" | "TAREFA_CORRIGIDA" | "AULA_ATUALIZADA" | "CONQUISTA_DESBLOQUEADA";
  titulo: string;
  mensagem: string;
  lida: boolean;
  criada_em: string;
};

const notificationMessages: Record<Notification["tipo"], string> = {
  TAREFA_NOVA: "Nova tarefa disponível",
  TAREFA_ENTREGUE: "Tarefa entregue",
  TAREFA_CORRIGIDA: "Tarefa corrigida",
  AULA_ATUALIZADA: "Aula atualizada",
  CONQUISTA_DESBLOQUEADA: "Nova conquista!",
};

export function useNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  // Real-time subscription para novas notificações
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes",
          filter: `usuario_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Mostrar toast para nova notificação
          toast({
            title: newNotification.titulo,
            description: newNotification.mensagem,
          });
          
          // Invalidar query para atualizar lista
          queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, toast]);

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

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true })
        .eq("usuario_id", userId!)
        .eq("lida", false);

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
    markAllAsRead: markAllAsRead.mutate,
  };
}

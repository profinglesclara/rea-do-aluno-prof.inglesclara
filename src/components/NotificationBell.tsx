import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { paraBrasilia } from "@/lib/utils";

interface NotificationBellProps {
  userId: string;
  isAdmin?: boolean;
}

const notificationIcons: Record<Notification["tipo"], string> = {
  TAREFA_NOVA: "📋",
  TAREFA_ENTREGUE: "✅",
  TAREFA_CORRIGIDA: "✏️",
  AULA_ATUALIZADA: "📅",
  CONQUISTA_DESBLOQUEADA: "🏆",
};

export function NotificationBell({ userId, isAdmin = false }: NotificationBellProps) {
  const { notifications, unreadCount, markAsRead } = useNotifications(userId);
  const navigate = useNavigate();
  const { toast } = useToast();

  const recentNotifications = notifications.slice(0, 10);

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId);
    toast({
      title: "Notificação marcada como lida",
    });
  };

  const formatDate = (date: string) => {
    try {
      return formatDistanceToNow(paraBrasilia(date), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "Data inválida";
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} não lidas</Badge>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {recentNotifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Você ainda não tem notificações.
            </div>
          ) : (
            <div className="divide-y">
              {recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-accent transition-colors ${
                    !notification.lida ? "bg-accent/50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">
                      {notificationIcons[notification.tipo]}
                    </span>
                    <div className="flex-1 space-y-1">
                      <p className={`text-sm ${!notification.lida ? "font-semibold" : ""}`}>
                        {notification.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.mensagem}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(notification.criada_em)}
                      </p>
                      {!notification.lida && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          Marcar como lida
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() =>
              navigate(isAdmin ? "/admin/notificacoes" : "/aluno/notificacoes")
            }
          >
            Ver todas as notificações
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Star, Target, Award, Zap, Heart, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface GerenciarConquistasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alunoId: string;
  alunoNome: string;
}

const iconMap: Record<string, any> = {
  Star,
  Trophy,
  Target,
  Award,
  Zap,
  Heart,
};

export function GerenciarConquistasDialog({
  open,
  onOpenChange,
  alunoId,
  alunoNome,
}: GerenciarConquistasDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todas as conquistas disponíveis
  const { data: conquistasMestre = [], isLoading } = useQuery({
    queryKey: ["conquistasMestre"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conquistas_mestre")
        .select("*")
        .eq("ativa", true)
        .order("ordem_exibicao");
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar conquistas desbloqueadas do aluno
  const { data: conquistasDesbloqueadas = [] } = useQuery({
    queryKey: ["conquistasAluno", alunoId],
    enabled: !!alunoId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conquistas_alunos")
        .select("*")
        .eq("aluno_id", alunoId);
      
      if (error) throw error;
      return data;
    },
  });

  // Desbloquear conquista
  const desbloquearMutation = useMutation({
    mutationFn: async (conquistaId: string) => {
      // 1. Criar registro em conquistas_alunos
      const { error: conquistaError } = await supabase
        .from("conquistas_alunos")
        .insert({
          aluno_id: alunoId,
          conquista_id: conquistaId,
          origem: "manual",
        });

      if (conquistaError) throw conquistaError;

      // 2. Buscar dados da conquista para notificação
      const { data: conquista } = await supabase
        .from("conquistas_mestre")
        .select("nome")
        .eq("id", conquistaId)
        .single();

      // 3. Criar notificação
      const { error: notifError } = await supabase
        .from("notificacoes")
        .insert({
          usuario_id: alunoId,
          tipo: "CONQUISTA_DESBLOQUEADA",
          titulo: "Nova conquista desbloqueada!",
          mensagem: `Parabéns! Você desbloqueou a conquista "${conquista?.nome}"`,
          lida: false,
        });

      if (notifError) throw notifError;

      // 4. Buscar email do aluno para enviar email
      const { data: aluno } = await supabase
        .from("usuarios")
        .select("email, nome_completo")
        .eq("user_id", alunoId)
        .single();

      if (aluno?.email) {
        // 5. Enviar email
        try {
          await supabase.functions.invoke("enviar-email-notificacao", {
            body: {
              to: aluno.email,
              subject: "🎉 Nova conquista desbloqueada!",
              html: `
                <h1>Parabéns, ${aluno.nome_completo}!</h1>
                <p>Você desbloqueou uma nova conquista:</p>
                <h2>🏆 ${conquista?.nome}</h2>
                <p>Continue assim! Seu progresso é incrível.</p>
              `,
            },
          });
        } catch (emailError) {
          console.error("Erro ao enviar email:", emailError);
          // Não bloqueia o fluxo se o email falhar
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conquistasAluno", alunoId] });
      toast({
        title: "Conquista desbloqueada!",
        description: "O aluno foi notificado sobre a nova conquista.",
      });
    },
    onError: (error) => {
      console.error("Erro ao desbloquear conquista:", error);
      toast({
        title: "Erro",
        description: "Não foi possível desbloquear a conquista.",
        variant: "destructive",
      });
    },
  });

  // Remover conquista
  const removerMutation = useMutation({
    mutationFn: async (conquistaId: string) => {
      const { error } = await supabase
        .from("conquistas_alunos")
        .delete()
        .eq("aluno_id", alunoId)
        .eq("conquista_id", conquistaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conquistasAluno", alunoId] });
      toast({
        title: "Conquista removida",
        description: "A conquista foi removida do aluno.",
      });
    },
    onError: (error) => {
      console.error("Erro ao remover conquista:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a conquista.",
        variant: "destructive",
      });
    },
  });

  const isConquistaDesbloqueada = (conquistaId: string) => {
    return conquistasDesbloqueadas.some((ca) => ca.conquista_id === conquistaId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Conquistas - {alunoNome}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando conquistas...
          </div>
        ) : (
          <div className="space-y-3">
            {conquistasMestre.map((conquista) => {
              const Icon = iconMap[conquista.icone] || Trophy;
              const desbloqueada = isConquistaDesbloqueada(conquista.id);

              return (
                <div
                  key={conquista.id}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <Icon
                    className={`h-8 w-8 flex-shrink-0 ${
                      desbloqueada ? "text-yellow-500" : "text-muted-foreground"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{conquista.nome}</h3>
                      {desbloqueada && (
                        <Badge variant="default" className="bg-yellow-500">
                          <Check className="h-3 w-3 mr-1" />
                          Desbloqueada
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {conquista.descricao}
                    </p>
                  </div>
                  <div>
                    {desbloqueada ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removerMutation.mutate(conquista.id)}
                        disabled={removerMutation.isPending}
                      >
                        Remover
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => desbloquearMutation.mutate(conquista.id)}
                        disabled={desbloquearMutation.isPending}
                      >
                        Desbloquear
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

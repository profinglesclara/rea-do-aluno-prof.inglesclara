import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Star, Target, Award, Zap, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const iconMap: Record<string, any> = {
  Star,
  Trophy,
  Target,
  Award,
  Zap,
  Heart,
};

export default function AlunoConquistas() {
  const navigate = useNavigate();

  // Buscar aluno logado
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      return usuario;
    },
  });

  // Buscar todas as conquistas disponíveis
  const { data: conquistasMestre = [] } = useQuery({
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
    queryKey: ["conquistasAluno", currentUser?.user_id],
    enabled: !!currentUser?.user_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conquistas_alunos")
        .select("*, conquistas_mestre(*)")
        .eq("aluno_id", currentUser!.user_id);
      
      if (error) throw error;
      return data;
    },
  });

  // Mapear conquistas com status de desbloqueio
  const conquistasComStatus = conquistasMestre.map((conquista) => {
    const desbloqueada = conquistasDesbloqueadas.find(
      (ca) => ca.conquista_id === conquista.id
    );
    
    return {
      ...conquista,
      desbloqueada: !!desbloqueada,
      dataDesbloqueio: desbloqueada?.data_desbloqueio,
    };
  });

  const conquistasDesbloqueadasList = conquistasComStatus.filter((c) => c.desbloqueada);
  const conquistasBloqueadasList = conquistasComStatus.filter((c) => !c.desbloqueada);

  const renderConquista = (conquista: any) => {
    const Icon = iconMap[conquista.icone] || Trophy;
    return (
      <Card
        key={conquista.id}
        className={`transition-all ${
          conquista.desbloqueada
            ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
            : "opacity-40 grayscale"
        }`}
      >
        <CardContent className="pt-6 text-center">
          <Icon className={`h-12 w-12 mx-auto mb-4 ${
            conquista.desbloqueada ? "text-yellow-500" : "text-muted-foreground"
          }`} />
          <h3 className="font-semibold mb-1">{conquista.nome}</h3>
          <p className="text-sm text-muted-foreground mb-2">{conquista.descricao}</p>
          {conquista.desbloqueada && conquista.dataDesbloqueio && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Conquistada em {format(new Date(conquista.dataDesbloqueio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
          {!conquista.desbloqueada && (
            <p className="text-xs text-muted-foreground">
              Ainda não desbloqueada
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/aluno/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Minhas Conquistas</h1>
            <p className="text-muted-foreground">
              {conquistasDesbloqueadasList.length} de {conquistasMestre.length} conquistas desbloqueadas
            </p>
          </div>
        </div>

        {/* Conquistas Desbloqueadas */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Desbloqueadas ({conquistasDesbloqueadasList.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conquistasDesbloqueadasList.map(renderConquista)}
          </div>
        </div>

        {/* Conquistas Bloqueadas */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-muted-foreground" />
            Bloqueadas ({conquistasBloqueadasList.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conquistasBloqueadasList.map(renderConquista)}
          </div>
        </div>
      </div>
    </div>
  );
}

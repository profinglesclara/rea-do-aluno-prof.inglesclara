import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDashboardAluno } from "@/hooks/useDashboardAluno";

export default function AlunoProgresso() {
  const navigate = useNavigate();

  // Buscar o primeiro aluno teste
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

  // Usar hook existente para dashboard
  const { data: dashboardData } = useDashboardAluno(aluno?.user_id);
  const dashboard = dashboardData?.dashboard;

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando progresso...</p>
      </div>
    );
  }

  const progressoPorCategoria = dashboard.progresso_por_categoria || {};

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/aluno/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Meu Progresso</h1>
        </div>

        {/* Progresso Geral */}
        <Card>
          <CardHeader>
            <CardTitle>Progresso Geral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Progresso total</span>
                <span className="text-sm font-bold">{dashboard.progresso_geral || 0}%</span>
              </div>
              <Progress value={dashboard.progresso_geral || 0} />
            </div>
          </CardContent>
        </Card>

        {/* Progresso por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle>Progresso por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.keys(progressoPorCategoria).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum dado de progresso por categoria disponível.
              </p>
            ) : (
              Object.entries(progressoPorCategoria).map(([categoria, dados]: [string, any]) => (
                <div key={categoria} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{categoria}</span>
                    <span className="text-sm text-muted-foreground">
                      {dados.concluidos}/{dados.total}
                    </span>
                  </div>
                  <Progress value={dados.percentual_concluido || 0} />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Concluídos: {dados.percentual_concluido?.toFixed(1) || 0}%</span>
                    <span>Em desenvolvimento: {dados.percentual_em_desenvolvimento?.toFixed(1) || 0}%</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

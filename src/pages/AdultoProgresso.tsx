import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";

export default function AdultoProgresso() {
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

  const { data: progressoData } = useQuery({
    queryKey: ["progressoAdulto", currentUser?.user_id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("progresso_geral, progresso_por_categoria")
        .eq("user_id", currentUser.user_id)
        .maybeSingle();

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
            <h1 className="text-3xl font-bold">Meu Progresso</h1>
          </div>
          <NotificationBell userId={currentUser?.user_id || ""} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Progresso Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progresso Geral</span>
              <span className="text-sm text-muted-foreground">
                {progressoData?.progresso_geral || 0}%
              </span>
            </div>
            <Progress value={progressoData?.progresso_geral || 0} />
          </CardContent>
        </Card>

        {progressoData?.progresso_por_categoria && 
         Object.keys(progressoData.progresso_por_categoria).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Progresso por Categoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(progressoData.progresso_por_categoria).map(
                ([categoria, dados]: [string, any]) => (
                  <div key={categoria}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{categoria}</span>
                      <span className="text-sm text-muted-foreground">
                        {dados.percentual_concluido || 0}%
                      </span>
                    </div>
                    <Progress value={dados.percentual_concluido || 0} />
                  </div>
                )
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

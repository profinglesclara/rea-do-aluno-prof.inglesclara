import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export default function AdultoConquistas() {
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

  const { data: conquistasDesbloqueadas } = useQuery({
    queryKey: ["conquistasAdulto", currentUser?.user_id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conquistas_alunos")
        .select("*, conquistas_mestre(*)")
        .eq("aluno_id", currentUser.user_id);

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
            <h1 className="text-3xl font-bold">Minhas Conquistas</h1>
          </div>
          <NotificationBell userId={currentUser?.user_id || ""} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Conquistas Desbloqueadas</CardTitle>
          </CardHeader>
          <CardContent>
            {!conquistasDesbloqueadas || conquistasDesbloqueadas.length === 0 ? (
              <p className="text-muted-foreground">
                Você ainda não desbloqueou nenhuma conquista.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {conquistasDesbloqueadas.map((conquista: any) => (
                  <div
                    key={conquista.id}
                    className="p-4 border rounded-lg flex flex-col items-center text-center"
                  >
                    <div className="text-4xl mb-2">{conquista.conquistas_mestre.icone}</div>
                    <h3 className="font-semibold">{conquista.conquistas_mestre.nome}</h3>
                    <p className="text-sm text-muted-foreground">
                      {conquista.conquistas_mestre.descricao}
                    </p>
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

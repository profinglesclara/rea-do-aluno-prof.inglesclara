import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarioAulas } from "@/components/CalendarioAulas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NotificationBell } from "@/components/NotificationBell";

export default function AlunoCalendario() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Buscar usuário logado
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error || !data) {
        navigate("/login");
        return;
      }

      if (data.tipo_usuario !== "Aluno") {
        navigate("/login");
        return;
      }

      setCurrentUser(data);
      setLoading(false);
    };

    fetchCurrentUser();
  }, [navigate]);

  const aluno = currentUser;

  // Buscar aulas do aluno
  const { data: aulas, isLoading } = useQuery({
    queryKey: ["aulasAluno", aluno?.user_id],
    enabled: !!aluno?.user_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .eq("aluno", aluno!.user_id)
        .order("data_aula", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/aluno/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Calendário de Aulas</h1>
              <p className="text-muted-foreground">
                Visualize suas aulas em formato de calendário
              </p>
            </div>
          </div>
          {aluno && <NotificationBell userId={aluno.user_id} />}
        </div>

        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Minhas Aulas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Carregando calendário...</div>
            ) : (
              <CalendarioAulas
                aulas={aulas || []}
                showAlunoName={false}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

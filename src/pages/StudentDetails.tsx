import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Target, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useDashboardAluno } from "@/hooks/useDashboardAluno";
import type { AlunoData } from "@/hooks/useDashboardAluno";

const StudentDetails = () => {
  const { aluno_id } = useParams<{ aluno_id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useDashboardAluno(aluno_id);
  const aluno: AlunoData | null = useMemo(
    () => (data?.dashboard ?? null),
    [data]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (error || !aluno) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {error ? "Erro ao carregar o aluno." : "Aluno não encontrado."}
          </p>
          <Button onClick={() => navigate("/admin")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string | null) =>
    dateString
      ? new Date(dateString).toLocaleDateString("pt-BR")
      : "—";

  const formatDateTime = (d: string | null) =>
    d
      ? new Date(d).toLocaleString("pt-BR")
      : "—";

  const progressByCategory = Object.entries(
    aluno.progresso_por_categoria ?? {}
  ).map(([categoria, v]: [string, any]) => ({
    categoria,
    concluido: v.percentual_concluido ?? 0,
    em_desenvolvimento: v.percentual_em_desenvolvimento ?? 0,
  }));

  const historicoProgresso =
    aluno.historico_progresso?.map((item) => ({
      data: new Date(item.data).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      progresso: item.progresso_geral,
    })) ?? [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <Button
          variant="outline"
          onClick={() => navigate("/admin")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="mb-6">
          <h1 className="text-4xl font-bold">Detalhes do Aluno</h1>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-xl text-muted-foreground">
              {aluno.nome_completo} ({aluno.nivel_cefr} – {aluno.modalidade})
            </p>
            <Badge
              variant={aluno.status_aluno === "Ativo" ? "default" : "secondary"}
            >
              {aluno.status_aluno}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetails;

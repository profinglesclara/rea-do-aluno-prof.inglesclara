import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Eye, Download, FileText } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { paraBrasilia } from "@/lib/utils";

type RelatorioComAluno = {
  relatorio_id: string;
  mes_referencia: string;
  data_geracao: string | null;
  arquivo_pdf: string | null;
  porcentagem_concluida: number | null;
  porcentagem_em_desenvolvimento: number | null;
  aluno: string;
  nome_aluno: string;
};

export default function ResponsavelRelatorios() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alunoFilter, setAlunoFilter] = useState<string>("all");

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/login"); return; }

      const { data } = await supabase
        .from("usuarios")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!data || data.tipo_usuario !== "Responsável") { navigate("/login"); return; }
      setCurrentUser(data);
      setLoading(false);
    };
    fetchCurrentUser();
  }, [navigate]);

  // Fetch linked students
  const { data: alunosVinculados } = useQuery({
    queryKey: ["responsavel-alunos", currentUser?.user_id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data: vinculos } = await supabase
        .from("responsaveis_alunos")
        .select("aluno_id")
        .eq("responsavel_id", currentUser.user_id);

      if (!vinculos || vinculos.length === 0) return [];

      const { data } = await supabase
        .from("usuarios")
        .select("user_id, nome_completo")
        .in("user_id", vinculos.map(v => v.aluno_id));

      return data || [];
    },
  });

  // Fetch reports for linked students
  const { data: relatorios, isLoading: loadingRelatorios } = useQuery({
    queryKey: ["responsavel-relatorios", currentUser?.user_id, alunosVinculados],
    enabled: !!alunosVinculados && alunosVinculados.length > 0,
    queryFn: async () => {
      const alunoIds = alunosVinculados!.map(a => a.user_id);

      const { data, error } = await supabase
        .from("relatorios_mensais")
        .select("relatorio_id, mes_referencia, data_geracao, arquivo_pdf, porcentagem_concluida, porcentagem_em_desenvolvimento, aluno")
        .in("aluno", alunoIds)
        .order("data_geracao", { ascending: false });

      if (error) throw error;

      // Map student names
      const nomeMap = new Map(alunosVinculados!.map(a => [a.user_id, a.nome_completo]));
      return (data || []).map(r => ({
        ...r,
        nome_aluno: nomeMap.get(r.aluno) || "Aluno",
      })) as RelatorioComAluno[];
    },
  });

  const filteredRelatorios = relatorios?.filter(r =>
    alunoFilter === "all" || r.aluno === alunoFilter
  ) || [];

  const formatMesReferencia = (mes: string) => {
    try {
      const [year, month] = mes.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return format(date, "MMMM/yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase());
    } catch {
      return mes;
    }
  };

  const formatDataEmissao = (data: string | null) => {
    if (!data) return "—";
    try {
      return format(paraBrasilia(data), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "—";
    }
  };

  const handleVisualizar = (arquivoPdf: string | null) => {
    if (!arquivoPdf) return;
    window.open(arquivoPdf, "_blank");
  };

  const handleDownload = (arquivoPdf: string | null, nomeAluno: string, mes: string) => {
    if (!arquivoPdf) return;
    const link = document.createElement("a");
    link.href = arquivoPdf;
    link.download = `Relatorio_${nomeAluno.replace(/\s+/g, "_")}_${mes}.pdf`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/responsavel/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Relatórios</h1>
              <p className="text-muted-foreground">Histórico de relatórios mensais dos seus alunos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell userId={currentUser.user_id} isResponsavel />
            <LogoutButton variant="outline" />
          </div>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatórios Mensais
              </CardTitle>
              {alunosVinculados && alunosVinculados.length > 1 && (
                <Select value={alunoFilter} onValueChange={setAlunoFilter}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Filtrar por aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os alunos</SelectItem>
                    {alunosVinculados.map(a => (
                      <SelectItem key={a.user_id} value={a.user_id}>
                        {a.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingRelatorios ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Carregando relatórios...</p>
              </div>
            ) : filteredRelatorios.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                <p className="text-muted-foreground">Nenhum relatório disponível no momento.</p>
                <p className="text-sm text-muted-foreground">
                  Os relatórios aparecerão aqui assim que forem gerados pelo professor.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aluno</TableHead>
                        <TableHead>Mês de Referência</TableHead>
                        <TableHead>Data de Emissão</TableHead>
                        <TableHead>Progresso</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRelatorios.map(r => (
                        <TableRow key={r.relatorio_id}>
                          <TableCell className="font-medium">{r.nome_aluno}</TableCell>
                          <TableCell>{formatMesReferencia(r.mes_referencia)}</TableCell>
                          <TableCell>{formatDataEmissao(r.data_geracao)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {r.porcentagem_concluida ?? 0}% concluído
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!r.arquivo_pdf}
                                onClick={() => handleVisualizar(r.arquivo_pdf)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Visualizar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!r.arquivo_pdf}
                                onClick={() => handleDownload(r.arquivo_pdf, r.nome_aluno, r.mes_referencia)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-4">
                  {filteredRelatorios.map(r => (
                    <div key={r.relatorio_id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.nome_aluno}</span>
                        <Badge variant="secondary">
                          {r.porcentagem_concluida ?? 0}%
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Mês: {formatMesReferencia(r.mes_referencia)}</p>
                        <p>Emitido em: {formatDataEmissao(r.data_geracao)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={!r.arquivo_pdf}
                          onClick={() => handleVisualizar(r.arquivo_pdf)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={!r.arquivo_pdf}
                          onClick={() => handleDownload(r.arquivo_pdf, r.nome_aluno, r.mes_referencia)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Baixar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

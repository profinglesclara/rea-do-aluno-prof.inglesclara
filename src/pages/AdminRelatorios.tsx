import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft } from "lucide-react";

type Relatorio = {
  relatorio_id: string;
  mes_referencia: string;
  data_geracao: string;
  porcentagem_concluida: number;
  porcentagem_em_desenvolvimento: number;
  comentario_automatico: string;
  conteudo_gerado: string;
  aluno: string;
  nome_aluno: string;
  nivel_cefr: string | null;
};

type Aluno = {
  user_id: string;
  nome_completo: string;
};

const AdminRelatorios = () => {
  const navigate = useNavigate();
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAluno, setSelectedAluno] = useState<string>("todos");
  const [selectedMes, setSelectedMes] = useState<string>("");
  const [selectedAno, setSelectedAno] = useState<string>("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRelatorio, setSelectedRelatorio] = useState<Relatorio | null>(null);

  useEffect(() => {
    loadAlunos();
    loadRelatorios();
  }, []);

  const loadAlunos = async () => {
    const { data, error } = await supabase
      .from("usuarios")
      .select("user_id, nome_completo")
      .in("tipo_usuario", ["Aluno", "Adulto"])
      .order("nome_completo");

    if (error) {
      console.error("Erro ao carregar alunos:", error);
    } else {
      setAlunos(data || []);
    }
  };

  const loadRelatorios = async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("relatorios_mensais")
      .select(`
        relatorio_id,
        mes_referencia,
        data_geracao,
        porcentagem_concluida,
        porcentagem_em_desenvolvimento,
        comentario_automatico,
        conteudo_gerado,
        aluno,
        usuarios!relatorios_mensais_aluno_fkey(nome_completo, nivel_cefr)
      `)
      .order("data_geracao", { ascending: false });

    const { data, error: queryError } = await query;

    if (queryError) {
      console.error("Erro ao carregar relatórios:", queryError);
      setError("Não foi possível carregar os relatórios.");
    } else {
      const mapped = (data || []).map((r: any) => ({
        relatorio_id: r.relatorio_id,
        mes_referencia: r.mes_referencia,
        data_geracao: r.data_geracao,
        porcentagem_concluida: r.porcentagem_concluida,
        porcentagem_em_desenvolvimento: r.porcentagem_em_desenvolvimento,
        comentario_automatico: r.comentario_automatico,
        conteudo_gerado: r.conteudo_gerado,
        aluno: r.aluno,
        nome_aluno: r.usuarios?.nome_completo || "—",
        nivel_cefr: r.usuarios?.nivel_cefr || null,
      }));
      setRelatorios(mapped);
    }

    setLoading(false);
  };

  const handleFilter = () => {
    loadRelatoriosFiltered();
  };

  const loadRelatoriosFiltered = async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("relatorios_mensais")
      .select(`
        relatorio_id,
        mes_referencia,
        data_geracao,
        porcentagem_concluida,
        porcentagem_em_desenvolvimento,
        comentario_automatico,
        conteudo_gerado,
        aluno,
        usuarios!relatorios_mensais_aluno_fkey(nome_completo, nivel_cefr)
      `)
      .order("data_geracao", { ascending: false });

    if (selectedAluno !== "todos") {
      query = query.eq("aluno", selectedAluno);
    }

    if (selectedMes && selectedAno) {
      const mesRef = `${selectedMes}/${selectedAno}`;
      query = query.eq("mes_referencia", mesRef);
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      console.error("Erro ao carregar relatórios:", queryError);
      setError("Não foi possível carregar os relatórios.");
    } else {
      const mapped = (data || []).map((r: any) => ({
        relatorio_id: r.relatorio_id,
        mes_referencia: r.mes_referencia,
        data_geracao: r.data_geracao,
        porcentagem_concluida: r.porcentagem_concluida,
        porcentagem_em_desenvolvimento: r.porcentagem_em_desenvolvimento,
        comentario_automatico: r.comentario_automatico,
        conteudo_gerado: r.conteudo_gerado,
        aluno: r.aluno,
        nome_aluno: r.usuarios?.nome_completo || "—",
        nivel_cefr: r.usuarios?.nivel_cefr || null,
      }));
      setRelatorios(mapped);
    }

    setLoading(false);
  };

  const handleClearFilters = () => {
    setSelectedAluno("todos");
    setSelectedMes("");
    setSelectedAno("");
    loadRelatorios();
  };

  const handleVerDetalhes = (relatorio: Relatorio) => {
    setSelectedRelatorio(relatorio);
    setDetailsOpen(true);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateWithTime = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const meses = [
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const anos = ["2024", "2025", "2026"];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Relatórios Mensais</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Aluno</label>
                <Select value={selectedAluno} onValueChange={setSelectedAluno}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os alunos</SelectItem>
                    {alunos.map((a) => (
                      <SelectItem key={a.user_id} value={a.user_id}>
                        {a.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Mês</label>
                <Select value={selectedMes} onValueChange={setSelectedMes}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Ano</label>
                <Select value={selectedAno} onValueChange={setSelectedAno}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map((ano) => (
                      <SelectItem key={ano} value={ano}>
                        {ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleFilter}>Filtrar</Button>
                <Button variant="outline" onClick={handleClearFilters}>
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Relatórios</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Carregando relatórios…</p>
            ) : error ? (
              <p className="text-destructive">{error}</p>
            ) : relatorios.length === 0 ? (
              <p className="text-muted-foreground">Nenhum relatório encontrado.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Aluno</TableHead>
                      <TableHead>Nível CEFR</TableHead>
                      <TableHead>Mês de Referência</TableHead>
                      <TableHead>Data de Geração</TableHead>
                      <TableHead>% Concluída</TableHead>
                      <TableHead>% Em Desenvolvimento</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatorios.map((rel) => (
                      <TableRow key={rel.relatorio_id}>
                        <TableCell className="font-medium">{rel.nome_aluno}</TableCell>
                        <TableCell>
                          {rel.nivel_cefr ? (
                            <Badge variant="outline">{rel.nivel_cefr}</Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{rel.mes_referencia}</TableCell>
                        <TableCell>{formatDate(rel.data_geracao)}</TableCell>
                        <TableCell>{rel.porcentagem_concluida ?? 0}%</TableCell>
                        <TableCell>{rel.porcentagem_em_desenvolvimento ?? 0}%</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerDetalhes(rel)}
                          >
                            Ver detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRelatorio && `Relatório Mensal - ${selectedRelatorio.nome_aluno} (${selectedRelatorio.mes_referencia})`}
            </DialogTitle>
          </DialogHeader>
          {selectedRelatorio && (
            <div className="space-y-6">
              {/* Bloco 1 - Informações Gerais */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Nome do Aluno</p>
                    <p className="text-base">{selectedRelatorio.nome_aluno}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Nível CEFR</p>
                    <p className="text-base">
                      {selectedRelatorio.nivel_cefr ? (
                        <Badge variant="outline">{selectedRelatorio.nivel_cefr}</Badge>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mês de Referência</p>
                    <p className="text-base">{selectedRelatorio.mes_referencia}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Data de Geração</p>
                    <p className="text-base">{formatDateWithTime(selectedRelatorio.data_geracao)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Bloco 2 - Progresso */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Progresso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">% Concluída</p>
                      <p className="text-sm font-medium">{selectedRelatorio.porcentagem_concluida ?? 0}%</p>
                    </div>
                    <Progress value={selectedRelatorio.porcentagem_concluida ?? 0} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">% Em Desenvolvimento</p>
                      <p className="text-sm font-medium">{selectedRelatorio.porcentagem_em_desenvolvimento ?? 0}%</p>
                    </div>
                    <Progress value={selectedRelatorio.porcentagem_em_desenvolvimento ?? 0} />
                  </div>
                </CardContent>
              </Card>

              {/* Bloco 3 - Comentário Automático */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Comentário Automático</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-md bg-muted/50">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedRelatorio.comentario_automatico || "Nenhum comentário automático gerado para este relatório."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRelatorios;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Search, ArrowLeft, Users, UserPlus, Link2, Pencil } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { FotoPerfil } from "@/components/FotoPerfil";
import { GerenciarVinculosDialog } from "@/components/admin/GerenciarVinculosDialog";
import { EditarPerfilResponsavelDialog } from "@/components/admin/EditarPerfilResponsavelDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";



type Responsavel = {
  user_id: string;
  nome_completo: string;
  nome_de_usuario: string;
  email: string;
  foto_perfil_url: string | null;
  status_aluno: string | null;
  telefone_responsavel: string | null;
  notas_internas: string | null;
  alunos_vinculados: {
    user_id: string;
    nome_completo: string;
    nivel_cefr: string | null;
  }[];
};

const AdminResponsaveis = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [vinculosDialogOpen, setVinculosDialogOpen] = useState(false);
  const [editarPerfilOpen, setEditarPerfilOpen] = useState(false);
  const [selectedResponsavel, setSelectedResponsavel] = useState<Responsavel | null>(null);

  // Buscar responsáveis
  const { data: responsaveis, isLoading, refetch } = useQuery({
    queryKey: ["responsaveis"],
    queryFn: async () => {
      // Buscar todos os responsáveis
      const { data: responsaveisData, error: responsaveisError } = await supabase
        .from("usuarios")
        .select("user_id, nome_completo, nome_de_usuario, email, foto_perfil_url, status_aluno, telefone_responsavel, notas_internas")
        .eq("tipo_usuario", "Responsável")
        .order("nome_completo");

      if (responsaveisError) throw responsaveisError;

      // Buscar todos os vínculos
      const { data: vinculosData, error: vinculosError } = await supabase
        .from("responsaveis_alunos")
        .select(`
          responsavel_id,
          aluno:usuarios!responsaveis_alunos_aluno_id_fkey(
            user_id,
            nome_completo,
            nivel_cefr
          )
        `);

      if (vinculosError) throw vinculosError;

      // Combinar dados
      const responsaveisComAlunos: Responsavel[] = (responsaveisData || []).map(
        (resp) => ({
          ...resp,
          alunos_vinculados:
            vinculosData
              ?.filter((v) => v.responsavel_id === resp.user_id)
              .map((v) => v.aluno as any)
              .filter(Boolean) || [],
        })
      );

      return responsaveisComAlunos;
    },
  });

  const filteredResponsaveis =
    responsaveis?.filter(
      (resp) =>
        resp.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resp.nome_de_usuario.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const handleGerenciarVinculos = (responsavel: Responsavel) => {
    setSelectedResponsavel(responsavel);
    setVinculosDialogOpen(true);
  };

  const handleEditarPerfil = (responsavel: Responsavel) => {
    setSelectedResponsavel(responsavel);
    setEditarPerfilOpen(true);
  };

  const handleVinculosAlterados = () => {
    refetch();
  };


  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/admin/dashboard")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  <CardTitle className="text-2xl font-bold">
                    Gerenciar Responsáveis
                  </CardTitle>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate("/admin/criar-usuario")}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Criar Responsável
                </Button>
                <LogoutButton variant="destructive" />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Busca */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Tabela */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Alunos Vinculados</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResponsaveis.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {responsaveis?.length === 0
                          ? "Nenhum responsável cadastrado."
                          : "Nenhum responsável encontrado."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredResponsaveis.map((resp) => (
                      <TableRow key={resp.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <FotoPerfil
                              fotoUrl={resp.foto_perfil_url}
                              nome={resp.nome_completo}
                              className="h-10 w-10"
                            />
                            <div>
                              <p className="font-medium">{resp.nome_completo}</p>
                              <p className="text-sm text-muted-foreground">
                                @{resp.nome_de_usuario}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{resp.email || "—"}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={resp.status_aluno === "Ativo" ? "default" : "secondary"}>
                            {resp.status_aluno || "Sem status"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {resp.alunos_vinculados.length === 0 ? (
                            <span className="text-sm text-muted-foreground">
                              Nenhum aluno vinculado
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {resp.alunos_vinculados.map((aluno) => (
                                <Badge
                                  key={aluno.user_id}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {aluno.nome_completo}
                                  {aluno.nivel_cefr && ` (${aluno.nivel_cefr})`}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditarPerfil(resp)}
                              className="gap-1"
                            >
                              <Pencil className="h-4 w-4" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGerenciarVinculos(resp)}
                              className="gap-1"
                            >
                              <Link2 className="h-4 w-4" />
                              Vínculos
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              Mostrando {filteredResponsaveis.length} de{" "}
              {responsaveis?.length || 0} responsáveis
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de vínculos */}
      {selectedResponsavel && (
        <>
          <GerenciarVinculosDialog
            open={vinculosDialogOpen}
            onOpenChange={setVinculosDialogOpen}
            responsavelId={selectedResponsavel.user_id}
            responsavelNome={selectedResponsavel.nome_completo}
            onVinculosAlterados={handleVinculosAlterados}
          />
          <EditarPerfilResponsavelDialog
            open={editarPerfilOpen}
            onOpenChange={setEditarPerfilOpen}
            responsavelId={selectedResponsavel.user_id}
            dadosAtuais={{
              nome_completo: selectedResponsavel.nome_completo,
              nome_de_usuario: selectedResponsavel.nome_de_usuario,
              email: selectedResponsavel.email,
              telefone_responsavel: selectedResponsavel.telefone_responsavel,
              status_aluno: selectedResponsavel.status_aluno,
              notas_internas: selectedResponsavel.notas_internas,
            }}
            onSuccess={() => refetch()}
          />
        </>
      )}
    </div>
  );
};

export default AdminResponsaveis;

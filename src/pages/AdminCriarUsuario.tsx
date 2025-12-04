import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";

const AdminCriarUsuario = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState<"Aluno" | "Responsável">("Aluno");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [senha, setSenha] = useState("");
  
  // Campos específicos para Aluno
  const [nivelAtual, setNivelAtual] = useState("A1");
  const [modalidade, setModalidade] = useState("Online");
  const [frequenciaMensal, setFrequenciaMensal] = useState(4);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        tipo_usuario: tipoUsuario,
        nome_completo: nomeCompleto,
        nome_de_usuario: nomeUsuario,
        senha,
      };

      if (tipoUsuario === "Aluno") {
        payload.nivel_atual = nivelAtual;
        payload.modalidade = modalidade;
        payload.frequencia_mensal = frequenciaMensal;
      }

      const { data, error } = await supabase.functions.invoke("criar-usuario-admin", {
        body: payload,
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error);
      }

      toast.success("Usuário criado com sucesso!");
      navigate("/admin/dashboard");
    } catch (error: any) {
      toast.error("Erro ao criar usuário: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <LogoutButton variant="destructive" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Criar Novo Usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tipoUsuario">Tipo de Usuário *</Label>
                <Select value={tipoUsuario} onValueChange={(value: "Aluno" | "Responsável") => setTipoUsuario(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aluno">Aluno</SelectItem>
                    <SelectItem value="Responsável">Responsável</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="nomeCompleto">Nome Completo *</Label>
                <Input
                  id="nomeCompleto"
                  value={nomeCompleto}
                  onChange={(e) => setNomeCompleto(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="nomeUsuario">Nome de Usuário *</Label>
                <Input
                  id="nomeUsuario"
                  value={nomeUsuario}
                  onChange={(e) => setNomeUsuario(e.target.value)}
                  required
                  placeholder="sem espaços ou caracteres especiais"
                />
              </div>

              <div>
                <Label htmlFor="senha">Senha Inicial *</Label>
                <Input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {tipoUsuario === "Aluno" && (
                <>
                  <div>
                    <Label htmlFor="nivelAtual">Nível CEFR *</Label>
                    <Select value={nivelAtual} onValueChange={setNivelAtual}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A1">A1</SelectItem>
                        <SelectItem value="A2">A2</SelectItem>
                        <SelectItem value="B1">B1</SelectItem>
                        <SelectItem value="B2">B2</SelectItem>
                        <SelectItem value="C1">C1</SelectItem>
                        <SelectItem value="C2">C2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="modalidade">Modalidade *</Label>
                    <Select value={modalidade} onValueChange={setModalidade}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="Presencial">Presencial</SelectItem>
                        <SelectItem value="Híbrido">Híbrido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="frequenciaMensal">Frequência Mensal (aulas/mês) *</Label>
                    <Input
                      id="frequenciaMensal"
                      type="number"
                      min="1"
                      value={frequenciaMensal}
                      onChange={(e) => setFrequenciaMensal(parseInt(e.target.value))}
                      required
                    />
                  </div>
                </>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Criando..." : "Criar Usuário"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCriarUsuario;

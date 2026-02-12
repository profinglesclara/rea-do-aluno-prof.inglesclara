import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { toast } from "sonner";

type TipoUsuario = "Admin" | "Responsável" | "Aluno";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use edge function to lookup user securely (bypasses RLS)
      const { data: lookupData, error: lookupError } = await supabase.functions.invoke(
        "lookup-user",
        { body: { identifier } }
      );

      if (lookupError) {
        toast.error("Erro ao buscar usuário: " + lookupError.message);
        setLoading(false);
        return;
      }

      if (!lookupData.found) {
        toast.error("Usuário não encontrado. Verifique o nome de usuário/e-mail ou crie uma conta.");
        setLoading(false);
        return;
      }

      // Verificar se o usuário tem e-mail cadastrado
      if (!lookupData.email) {
        toast.error("Este usuário não tem e-mail cadastrado. Contate o administrador.");
        setLoading(false);
        return;
      }

      // Fazer login no Supabase Auth usando o e-mail
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: lookupData.email,
        password,
      });

      if (authError) {
        toast.error("Erro ao fazer login: " + authError.message);
        setLoading(false);
        return;
      }

      if (!authData?.user) {
        toast.error("Erro inesperado: usuário autenticado não retornado.");
        setLoading(false);
        return;
      }

      const tipo = lookupData.tipo_usuario as TipoUsuario | null;

      if (!tipo) {
        toast.error("Tipo de usuário não definido. Contate o administrador.");
        setLoading(false);
        return;
      }

      toast.success("Login realizado com sucesso!");

      // Redirecionar conforme o tipo de usuário
      if (tipo === "Admin") {
        navigate("/admin/dashboard");
      } else if (tipo === "Responsável") {
        navigate("/responsavel/dashboard");
      } else if (tipo === "Aluno") {
        navigate("/aluno/dashboard");
      } else {
        toast.error("Tipo de usuário não reconhecido.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Ocorreu um erro inesperado ao fazer login.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">Bem-vindo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="identifier">Nome de usuário ou e-mail</Label>
              <Input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="seu_usuario ou email@exemplo.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const Login = () => {
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Buscar o email técnico baseado no nome de usuário
      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("email, tipo_usuario")
        .eq("nome_de_usuario", nomeUsuario)
        .maybeSingle();

      if (userError) {
        toast.error("Erro ao buscar usuário: " + userError.message);
        setLoading(false);
        return;
      }

      if (!userData) {
        toast.error("Usuário não encontrado");
        setLoading(false);
        return;
      }

      // 2. Autenticar no Supabase Auth usando o email
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password,
      });

      if (authError) {
        toast.error("Senha incorreta");
        setLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error("Erro ao fazer login");
        setLoading(false);
        return;
      }

      // 3. Redirecionar baseado no tipo de usuário
      switch (userData.tipo_usuario) {
        case "Admin":
          navigate("/admin/dashboard");
          break;
        case "Responsável":
          navigate("/responsavel/dashboard");
          break;
        case "Aluno":
          navigate("/aluno/dashboard");
          break;
        default:
          toast.error("Tipo de usuário não reconhecido");
          break;
      }
    } catch (error: any) {
      toast.error("Erro ao fazer login: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="nomeUsuario">Nome de usuário</Label>
              <Input
                id="nomeUsuario"
                type="text"
                value={nomeUsuario}
                onChange={(e) => setNomeUsuario(e.target.value)}
                required
                autoComplete="username"
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
                autoComplete="current-password"
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

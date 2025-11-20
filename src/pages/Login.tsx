import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Erro ao fazer login: " + error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      alert("Erro inesperado: usuário não retornado pela autenticação.");
      setLoading(false);
      return;
    }

    // 🔧 REGRA ESPECIAL: Aluno Teste
    // Se for o usuário de teste, ignora a tabela `usuarios`
    // e manda direto para o dashboard de aluno.
    if (data.user.email === "aluno.teste@teste.com") {
      navigate("/aluno/dashboard");
      setLoading(false);
      return;
    }

    // Para todos os OUTROS usuários, segue o fluxo normal:
    // buscar tipo de usuário na tabela `usuarios`
    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select("tipo_usuario")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (userError) {
      alert("Erro ao buscar dados do usuário: " + userError.message);
      setLoading(false);
      return;
    }

    if (!userData) {
      alert("Usuário autenticado, mas não encontrado na base de dados. Entre em contato com o administrador.");
      setLoading(false);
      return;
    }

    // Redirecionar baseado no tipo de usuário
    switch (userData.tipo_usuario) {
      case "Admin":
        navigate("/admin");
        break;
      case "Responsável":
        navigate("/responsavel/dashboard");
        break;
      case "Adulto":
        navigate("/adulto/dashboard");
        break;
      case "Aluno":
        navigate("/aluno/dashboard");
        break;
      default:
        alert("Tipo de usuário não reconhecido.");
        break;
    }

    setLoading(false);
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
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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

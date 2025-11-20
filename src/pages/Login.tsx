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

    // 1) Login na Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Erro ao fazer login: " + error.message);
      setLoading(false);
      return;
    }

    const authUser = data.user;

    if (!authUser) {
      alert("Erro inesperado: usuário não retornado pela autenticação.");
      setLoading(false);
      return;
    }

    // 2) Tentar buscar na tabela 'usuarios' pelo user_id (fluxo normal)
    let userRow: { tipo_usuario: string } | null = null;

    const { data: userById, error: userByIdError } = await supabase
      .from("usuarios")
      .select("user_id, email, tipo_usuario")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (userByIdError) {
      alert("Erro ao buscar dados do usuário por ID: " + userByIdError.message);
      setLoading(false);
      return;
    }

    if (userById) {
      userRow = userById;
    } else {
      // 3) Se não achou por ID (caso do Aluno Teste), tentar por e-mail
      const { data: userByEmail, error: userByEmailError } = await supabase
        .from("usuarios")
        .select("user_id, email, tipo_usuario")
        .eq("email", authUser.email)
        .maybeSingle();

      if (userByEmailError) {
        alert("Erro ao buscar dados do usuário por e-mail: " + userByEmailError.message);
        setLoading(false);
        return;
      }

      if (!userByEmail) {
        alert("Usuário autenticado, mas não encontrado na tabela de usuários. Entre em contato com o administrador.");
        setLoading(false);
        return;
      }

      userRow = userByEmail;

      // 4) TENTATIVA OPCIONAL DE CORRIGIR O user_id ZOADO
      // (se a política do Supabase permitir, ótimo; se não, o login já funciona mesmo assim)
      const { error: updateError } = await supabase
        .from("usuarios")
        .update({ user_id: authUser.id })
        .eq("email", authUser.email);

      if (updateError) {
        console.warn("Não foi possível atualizar o user_id na tabela usuarios:", updateError);
      }
    }

    // 5) Se ainda assim não tiver userRow, aborta
    if (!userRow) {
      alert("Não foi possível localizar o cadastro do usuário. Entre em contato com o administrador.");
      setLoading(false);
      return;
    }

    // 6) Redirecionar de acordo com o tipo de usuário
    switch (userRow.tipo_usuario) {
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
    <div className="min-h-screen flex items-center justify-center bg-background">
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

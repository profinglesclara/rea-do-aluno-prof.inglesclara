import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type TipoUsuario = "Admin" | "Responsável" | "Aluno";

const Login = () => {
  // Vamos chamar de "identificador" porque pode ser nome_de_usuario OU email
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1) Tentar encontrar o usuário na tabela `usuarios`
      //    Primeiro por nome_de_usuario
      const { data: byUsername, error: userByUsernameError } = await supabase
        .from("usuarios")
        .select("user_id, email, tipo_usuario, nome_de_usuario")
        .eq("nome_de_usuario", identifier)
        .maybeSingle();

      if (userByUsernameError) {
        alert("Erro ao buscar usuário por nome de usuário: " + userByUsernameError.message);
        setLoading(false);
        return;
      }

      let usuario = byUsername;

      // 2) Se não achou por nome_de_usuario, tentar por email
      if (!usuario) {
        const { data: byEmail, error: userByEmailError } = await supabase
          .from("usuarios")
          .select("user_id, email, tipo_usuario, nome_de_usuario")
          .eq("email", identifier)
          .maybeSingle();

        if (userByEmailError) {
          alert("Erro ao buscar usuário por e-mail: " + userByEmailError.message);
          setLoading(false);
          return;
        }

        usuario = byEmail;
      }

      // 3) Se ainda assim não achou, usuário realmente não existe
      if (!usuario) {
        alert("Usuário não encontrado. Confira o nome de usuário / e-mail ou fale com a professora.");
        setLoading(false);
        return;
      }

      // 4) Verificar se o usuário tem e-mail cadastrado (necessário para o Supabase Auth)
      if (!usuario.email) {
        alert(
          "Este usuário ainda não tem e-mail cadastrado. Peça para a professora adicionar um e-mail ao seu perfil.",
        );
        setLoading(false);
        return;
      }

      // 5) Fazer login no Supabase Auth usando o e-mail do registro encontrado
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: usuario.email,
        password,
      });

      if (authError) {
        alert("Erro ao fazer login: " + authError.message);
        setLoading(false);
        return;
      }

      if (!authData?.user) {
        alert("Erro inesperado: usuário autenticado não retornado.");
        setLoading(false);
        return;
      }

      // (Opcional) Conferir se o id do Auth bate com o user_id da tabela usuarios
      // Se não bater, não vamos bloquear, só seguir com o que está na tabela.
      // Isso evita travar por causa de dados antigos.

      const tipo = usuario.tipo_usuario as TipoUsuario | null;

      if (!tipo) {
        alert("Tipo de usuário não definido. Fale com a professora.");
        setLoading(false);
        return;
      }

      // 6) Redirecionar conforme o tipo de usuário
      if (tipo === "Admin") {
        navigate("/admin/dashboard");
      } else if (tipo === "Responsável") {
        navigate("/responsavel/dashboard");
      } else if (tipo === "Aluno") {
        navigate("/aluno/dashboard");
      } else {
        alert("Tipo de usuário não reconhecido. Fale com a professora.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Ocorreu um erro inesperado ao fazer login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">Login</CardTitle>
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

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type TipoUsuario = "Admin" | "Responsável" | "Aluno";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Cadastro states
  const [registerName, setRegisterName] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1) Tentar encontrar o usuário na tabela `usuarios`
      const { data: byUsername, error: userByUsernameError } = await supabase
        .from("usuarios")
        .select("user_id, email, tipo_usuario, nome_de_usuario")
        .eq("nome_de_usuario", identifier)
        .maybeSingle();

      if (userByUsernameError) {
        toast.error("Erro ao buscar usuário: " + userByUsernameError.message);
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
          toast.error("Erro ao buscar usuário: " + userByEmailError.message);
          setLoading(false);
          return;
        }

        usuario = byEmail;
      }

      // 3) Se ainda assim não achou, usuário não existe
      if (!usuario) {
        toast.error("Usuário não encontrado. Verifique o nome de usuário/e-mail ou crie uma conta.");
        setLoading(false);
        return;
      }

      // 4) Verificar se o usuário tem e-mail cadastrado
      if (!usuario.email) {
        toast.error("Este usuário não tem e-mail cadastrado. Contate o administrador.");
        setLoading(false);
        return;
      }

      // 5) Fazer login no Supabase Auth usando o e-mail
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: usuario.email,
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

      const tipo = usuario.tipo_usuario as TipoUsuario | null;

      if (!tipo) {
        toast.error("Tipo de usuário não definido. Contate o administrador.");
        setLoading(false);
        return;
      }

      toast.success("Login realizado com sucesso!");

      // 6) Redirecionar conforme o tipo de usuário
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);

    try {
      // Validações básicas
      if (!registerName || !registerUsername || !registerEmail || !registerPassword) {
        toast.error("Preencha todos os campos obrigatórios.");
        setRegisterLoading(false);
        return;
      }

      if (registerPassword.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres.");
        setRegisterLoading(false);
        return;
      }

      // Verificar se username já existe
      const { data: existingUser } = await supabase
        .from("usuarios")
        .select("user_id")
        .eq("nome_de_usuario", registerUsername)
        .maybeSingle();

      if (existingUser) {
        toast.error("Este nome de usuário já está em uso.");
        setRegisterLoading(false);
        return;
      }

      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) {
        toast.error("Erro ao criar conta: " + authError.message);
        setRegisterLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error("Erro ao criar conta: usuário não retornado.");
        setRegisterLoading(false);
        return;
      }

      // Criar registro na tabela usuarios (como Aluno por padrão)
      // Note: senha is NOT stored in usuarios table - authentication is handled by Supabase Auth
      const { error: insertError } = await supabase.from("usuarios").insert({
        user_id: authData.user.id,
        nome_completo: registerName,
        nome_de_usuario: registerUsername,
        email: registerEmail,
        tipo_usuario: "Aluno",
      });

      if (!insertError) {
        // Also add role to user_roles table
        await supabase.from("user_roles").insert({
          user_id: authData.user.id,
          role: "aluno",
        });
      }

      if (insertError) {
        toast.error("Erro ao salvar perfil: " + insertError.message);
        // Tentar excluir o usuário do Auth se falhar
        setRegisterLoading(false);
        return;
      }

      toast.success("Conta criada com sucesso! Faça login para continuar.");
      
      // Limpar formulário e voltar para aba de login
      setRegisterName("");
      setRegisterUsername("");
      setRegisterEmail("");
      setRegisterPassword("");
      
    } catch (err: any) {
      console.error(err);
      toast.error("Ocorreu um erro inesperado ao criar conta.");
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">Bem-vindo</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Criar Conta</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
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
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="registerName">Nome completo *</Label>
                  <Input
                    id="registerName"
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="João da Silva"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="registerUsername">Nome de usuário *</Label>
                  <Input
                    id="registerUsername"
                    type="text"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value.toLowerCase().replace(/\s/g, "_"))}
                    placeholder="joao_silva"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="registerEmail">E-mail *</Label>
                  <Input
                    id="registerEmail"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="joao@email.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="registerPassword">Senha *</Label>
                  <Input
                    id="registerPassword"
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={registerLoading}>
                  {registerLoading ? "Criando conta..." : "Criar Conta"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Novas contas são criadas como Aluno. Contate o administrador para alterar o tipo.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

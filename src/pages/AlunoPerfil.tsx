import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FotoPerfil } from "@/components/FotoPerfil";
import { EditarFotoPerfilDialog } from "@/components/EditarFotoPerfilDialog";
import { LogoutButton } from "@/components/LogoutButton";
import { ArrowLeft, Lock, Mail, KeyRound, Loader2, Save } from "lucide-react";

export default function AlunoPerfil() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fotoDialogOpen, setFotoDialogOpen] = useState(false);

  // Email editing
  const [email, setEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // Password editing
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/login"); return; }

      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error || !data || data.tipo_usuario !== "Aluno") {
        navigate("/login");
        return;
      }

      setCurrentUser(data);
      setEmail(data.email || "");
      setLoading(false);
    };
    fetchUser();
  }, [navigate]);

  const handleSaveEmail = async () => {
    if (!currentUser) return;
    setSavingEmail(true);
    try {
      const { error } = await supabase
        .from("usuarios")
        .update({ email })
        .eq("user_id", currentUser.user_id);

      if (error) throw error;

      setCurrentUser((prev: any) => ({ ...prev, email }));
      toast({ title: "E-mail atualizado", description: "Seu e-mail foi salvo com sucesso." });
    } catch {
      toast({ title: "Erro", description: "Não foi possível atualizar o e-mail.", variant: "destructive" });
    } finally {
      setSavingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    if (!novaSenha || !confirmarSenha) {
      toast({ title: "Campos obrigatórios", description: "Preencha a nova senha e a confirmação.", variant: "destructive" });
      return;
    }
    if (novaSenha.length < 6) {
      toast({ title: "Senha fraca", description: "A nova senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast({ title: "Senhas não coincidem", description: "A nova senha e a confirmação devem ser iguais.", variant: "destructive" });
      return;
    }

    setSavingPassword(true);
    try {
      // Verify current password by re-signing in
      if (senhaAtual) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: `${currentUser.nome_de_usuario}@aluno.app`,
          password: senhaAtual,
        });
        if (signInError) {
          toast({ title: "Senha atual incorreta", description: "Verifique sua senha atual e tente novamente.", variant: "destructive" });
          setSavingPassword(false);
          return;
        }
      }

      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;

      toast({ title: "Senha alterada", description: "Sua senha foi atualizada com sucesso." });
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch {
      toast({ title: "Erro", description: "Não foi possível alterar a senha.", variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleFotoAtualizada = (novaUrl: string | null) => {
    setCurrentUser((prev: any) => ({ ...prev, foto_perfil_url: novaUrl }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/aluno/dashboard")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao painel
          </Button>
          <LogoutButton variant="outline" />
        </div>

        {/* Profile Photo & Name */}
        <div className="flex flex-col items-center gap-4">
          <FotoPerfil
            fotoUrl={currentUser.foto_perfil_url}
            nome={currentUser.nome_completo}
            className="h-24 w-24 text-2xl"
            onClick={() => setFotoDialogOpen(true)}
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold">{currentUser.nome_completo}</h1>
            <p className="text-sm text-muted-foreground">Meu Perfil</p>
          </div>
        </div>

        <EditarFotoPerfilDialog
          open={fotoDialogOpen}
          onOpenChange={setFotoDialogOpen}
          userId={currentUser.user_id}
          nome={currentUser.nome_completo}
          fotoAtual={currentUser.foto_perfil_url}
          onFotoAtualizada={handleFotoAtualizada}
        />

        {/* Read-only Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Nome Completo
              </Label>
              <Input
                value={currentUser.nome_completo}
                readOnly
                className="bg-muted cursor-not-allowed opacity-70"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Nome de Usuário
              </Label>
              <Input
                value={currentUser.nome_de_usuario}
                readOnly
                className="bg-muted cursor-not-allowed opacity-70"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Nível CEFR
              </Label>
              <Input
                value={currentUser.nivel_cefr || "Não definido"}
                readOnly
                className="bg-muted cursor-not-allowed opacity-70"
              />
            </div>
          </CardContent>
        </Card>

        {/* Editable Email */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5" />
              E-mail
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>E-mail cadastrado</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
            <Button
              onClick={handleSaveEmail}
              disabled={savingEmail || email === currentUser.email}
              className="gap-2"
            >
              {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar E-mail
            </Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Senha atual</Label>
              <Input
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="Digite sua senha atual"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a nova senha"
              />
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={savingPassword || !novaSenha || !confirmarSenha}
              className="gap-2"
            >
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Alterar Senha
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

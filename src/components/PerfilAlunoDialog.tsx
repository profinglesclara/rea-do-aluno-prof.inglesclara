import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FotoPerfil } from "@/components/FotoPerfil";
import { EditarFotoPerfilDialog } from "@/components/EditarFotoPerfilDialog";
import { Lock, Mail, KeyRound, Loader2, Save } from "lucide-react";

interface PerfilAlunoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    user_id: string;
    nome_completo: string;
    nome_de_usuario: string;
    email: string;
    nivel_cefr: string | null;
    foto_perfil_url: string | null;
  };
  onUserUpdated?: (updates: Partial<{ email: string; foto_perfil_url: string | null }>) => void;
}

export function PerfilAlunoDialog({ open, onOpenChange, user, onUserUpdated }: PerfilAlunoDialogProps) {
  const { toast } = useToast();
  const [fotoDialogOpen, setFotoDialogOpen] = useState(false);

  const [email, setEmail] = useState(user.email || "");
  const [savingEmail, setSavingEmail] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Sync email when user prop changes
  useEffect(() => {
    setEmail(user.email || "");
  }, [user.email]);

  const handleSaveEmail = async () => {
    setSavingEmail(true);
    try {
      const { error } = await supabase
        .from("usuarios")
        .update({ email })
        .eq("user_id", user.user_id);
      if (error) throw error;
      onUserUpdated?.({ email });
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
      if (senhaAtual) {
        const { data: { session } } = await supabase.auth.getSession();
        const authEmail = session?.user?.email;
        if (!authEmail) {
          toast({ title: "Erro", description: "Sessão não encontrada. Faça login novamente.", variant: "destructive" });
          setSavingPassword(false);
          return;
        }
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authEmail,
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
    onUserUpdated?.({ foto_perfil_url: novaUrl });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Meu Perfil</DialogTitle>
          </DialogHeader>

          {/* Photo & Name */}
          <div className="flex flex-col items-center gap-3 py-2">
            <FotoPerfil
              fotoUrl={user.foto_perfil_url}
              nome={user.nome_completo}
              className="h-20 w-20"
              onClick={() => setFotoDialogOpen(true)}
            />
            <p className="text-xs text-muted-foreground">Clique na foto para alterar</p>
          </div>

          {/* Read-only fields */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Lock className="h-3 w-3" /> Nome Completo
              </Label>
              <Input value={user.nome_completo} readOnly className="bg-muted cursor-not-allowed opacity-70 h-9" />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Lock className="h-3 w-3" /> Nome de Usuário
              </Label>
              <Input value={user.nome_de_usuario} readOnly className="bg-muted cursor-not-allowed opacity-70 h-9" />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Lock className="h-3 w-3" /> Nível CEFR
              </Label>
              <Input value={user.nivel_cefr || "Não definido"} readOnly className="bg-muted cursor-not-allowed opacity-70 h-9" />
            </div>
          </div>

          <Separator />

          {/* Editable email */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Mail className="h-4 w-4" /> E-mail
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="h-9"
            />
            <Button
              size="sm"
              onClick={handleSaveEmail}
              disabled={savingEmail || email === user.email}
              className="gap-1.5"
            >
              {savingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar E-mail
            </Button>
          </div>

          <Separator />

          {/* Change password */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <KeyRound className="h-4 w-4" /> Alterar Senha
            </Label>
            <Input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              placeholder="Senha atual"
              className="h-9"
            />
            <Input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Nova senha (mín. 6 caracteres)"
              className="h-9"
            />
            <Input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Confirmar nova senha"
              className="h-9"
            />
            <Button
              size="sm"
              onClick={handleChangePassword}
              disabled={savingPassword || !novaSenha || !confirmarSenha}
              className="gap-1.5"
            >
              {savingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
              Alterar Senha
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EditarFotoPerfilDialog
        open={fotoDialogOpen}
        onOpenChange={setFotoDialogOpen}
        userId={user.user_id}
        nome={user.nome_completo}
        fotoAtual={user.foto_perfil_url}
        onFotoAtualizada={handleFotoAtualizada}
      />
    </>
  );
}

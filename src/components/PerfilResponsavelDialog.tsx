import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { FotoPerfil } from "@/components/FotoPerfil";
import { EditarFotoPerfilDialog } from "@/components/EditarFotoPerfilDialog";
import { Lock, Mail, Phone, User, KeyRound, Loader2, Save, Users } from "lucide-react";

interface PerfilResponsavelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    user_id: string;
    nome_completo: string;
    nome_de_usuario: string;
    email: string;
    telefone_responsavel: string | null;
    foto_perfil_url: string | null;
  };
  onUserUpdated?: (updates: Partial<{
    nome_completo: string;
    email: string;
    telefone_responsavel: string | null;
    foto_perfil_url: string | null;
  }>) => void;
}

export function PerfilResponsavelDialog({ open, onOpenChange, user, onUserUpdated }: PerfilResponsavelDialogProps) {
  const { toast } = useToast();
  const [fotoDialogOpen, setFotoDialogOpen] = useState(false);

  const [nomeCompleto, setNomeCompleto] = useState(user.nome_completo || "");
  const [email, setEmail] = useState(user.email || "");
  const [telefone, setTelefone] = useState(user.telefone_responsavel || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Sync fields when user prop changes
  useEffect(() => {
    setNomeCompleto(user.nome_completo || "");
    setEmail(user.email || "");
    setTelefone(user.telefone_responsavel || "");
  }, [user.nome_completo, user.email, user.telefone_responsavel]);

  // Fetch linked students (read-only)
  const { data: alunosVinculados } = useQuery({
    queryKey: ["perfilResponsavelAlunos", user.user_id],
    enabled: open && !!user.user_id,
    queryFn: async () => {
      const { data: vinculos } = await supabase
        .from("responsaveis_alunos")
        .select("aluno_id")
        .eq("responsavel_id", user.user_id);

      if (!vinculos || vinculos.length === 0) return [];

      const { data, error } = await supabase
        .from("usuarios")
        .select("user_id, nome_completo, nivel_cefr")
        .in("user_id", vinculos.map(v => v.aluno_id));

      if (error) throw error;
      return data || [];
    },
  });

  const hasProfileChanges =
    nomeCompleto !== user.nome_completo ||
    email !== user.email ||
    (telefone || "") !== (user.telefone_responsavel || "");

  const handleSaveProfile = async () => {
    if (!nomeCompleto.trim()) {
      toast({ title: "Campo obrigatório", description: "O nome completo não pode estar vazio.", variant: "destructive" });
      return;
    }

    setSavingProfile(true);
    try {
      const updates: Record<string, any> = {
        nome_completo: nomeCompleto.trim(),
        email: email.trim(),
        telefone_responsavel: telefone.trim() || null,
      };

      const { error } = await supabase
        .from("usuarios")
        .update(updates)
        .eq("user_id", user.user_id);

      if (error) throw error;

      onUserUpdated?.({
        nome_completo: updates.nome_completo,
        email: updates.email,
        telefone_responsavel: updates.telefone_responsavel,
      });

      toast({ title: "Perfil atualizado", description: "Suas informações foram salvas com sucesso." });
    } catch {
      toast({ title: "Erro", description: "Não foi possível atualizar o perfil.", variant: "destructive" });
    } finally {
      setSavingProfile(false);
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
        // Get the actual auth email from the current session
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
                <Lock className="h-3 w-3" /> Nome de Usuário
              </Label>
              <Input value={user.nome_de_usuario} readOnly className="bg-muted cursor-not-allowed opacity-70 h-9" />
            </div>
          </div>

          <Separator />

          {/* Editable fields */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <User className="h-4 w-4" /> Nome Completo
              </Label>
              <Input
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                placeholder="Seu nome completo"
                className="h-9"
              />
            </div>

            <div className="space-y-1">
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
            </div>

            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Phone className="h-4 w-4" /> Telefone de Contato
              </Label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="h-9"
              />
            </div>

            <Button
              size="sm"
              onClick={handleSaveProfile}
              disabled={savingProfile || !hasProfileChanges}
              className="gap-1.5"
            >
              {savingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar Alterações
            </Button>
          </div>

          <Separator />

          {/* Linked students (read-only) */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Users className="h-4 w-4" /> Alunos Vinculados
            </Label>
            <div className="space-y-2">
              {!alunosVinculados || alunosVinculados.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum aluno vinculado.</p>
              ) : (
                alunosVinculados.map((aluno) => (
                  <div
                    key={aluno.user_id}
                    className="flex items-center justify-between rounded-md border p-2.5 bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{aluno.nome_completo}</span>
                    </div>
                    {aluno.nivel_cefr && (
                      <Badge variant="secondary" className="text-xs">{aluno.nivel_cefr}</Badge>
                    )}
                  </div>
                ))
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Os vínculos são gerenciados pelo administrador.
              </p>
            </div>
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

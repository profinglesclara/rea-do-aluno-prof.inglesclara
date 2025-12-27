import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Trash2, Upload, Loader2 } from "lucide-react";

interface EditarFotoPerfilDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  nome: string;
  fotoAtual?: string | null;
  onFotoAtualizada: (novaUrl: string | null) => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function EditarFotoPerfilDialog({
  open,
  onOpenChange,
  userId,
  nome,
  fotoAtual,
  onFotoAtualizada,
}: EditarFotoPerfilDialogProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const iniciais = nome
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Selecione uma imagem JPG, PNG ou WebP.",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho
    if (file.size > MAX_SIZE) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 5MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const extension = selectedFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${userId}/avatar.${extension}`;

      // Upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, selectedFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Adicionar timestamp para evitar cache
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

      // Atualizar na tabela usuarios
      const { error: updateError } = await supabase
        .from("usuarios")
        .update({ foto_perfil_url: urlWithTimestamp })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });

      onFotoAtualizada(urlWithTimestamp);
      setPreview(null);
      setSelectedFile(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro ao atualizar foto",
        description: "Não foi possível fazer o upload da foto.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!fotoAtual) return;

    setRemoving(true);
    try {
      // Listar arquivos do usuário para encontrar o avatar
      const { data: files } = await supabase.storage
        .from("avatars")
        .list(userId);

      if (files && files.length > 0) {
        const filesToRemove = files.map(f => `${userId}/${f.name}`);
        await supabase.storage.from("avatars").remove(filesToRemove);
      }

      // Atualizar na tabela usuarios
      const { error: updateError } = await supabase
        .from("usuarios")
        .update({ foto_perfil_url: null })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      toast({
        title: "Foto removida",
        description: "Sua foto de perfil foi removida com sucesso.",
      });

      onFotoAtualizada(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao remover foto:", error);
      toast({
        title: "Erro ao remover foto",
        description: "Não foi possível remover a foto.",
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
    }
  };

  const handleClose = () => {
    setPreview(null);
    setSelectedFile(null);
    onOpenChange(false);
  };

  const displayUrl = preview || fotoAtual;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Foto de Perfil</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <Avatar className="h-32 w-32">
            {displayUrl && <AvatarImage src={displayUrl} alt={nome} />}
            <AvatarFallback className="text-3xl">{iniciais}</AvatarFallback>
          </Avatar>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || removing}
            >
              <Camera className="mr-2 h-4 w-4" />
              {fotoAtual || preview ? "Alterar foto" : "Adicionar foto"}
            </Button>
            
            {fotoAtual && !preview && (
              <Button
                variant="destructive"
                onClick={handleRemove}
                disabled={uploading || removing}
              >
                {removing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Remover
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Formatos aceitos: JPG, PNG, WebP. Tamanho máximo: 5MB.
          </p>
        </div>

        {preview && (
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPreview(null); setSelectedFile(null); }}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Salvar foto
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

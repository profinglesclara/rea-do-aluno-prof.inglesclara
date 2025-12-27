import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface FotoPerfilProps {
  fotoUrl?: string | null;
  nome: string;
  className?: string;
  onClick?: () => void;
}

export function FotoPerfil({ fotoUrl, nome, className, onClick }: FotoPerfilProps) {
  const iniciais = nome
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Avatar 
      className={cn("cursor-pointer hover:ring-2 hover:ring-primary transition-all", className)}
      onClick={onClick}
    >
      {fotoUrl && <AvatarImage src={fotoUrl} alt={nome} />}
      <AvatarFallback className="text-lg">{iniciais}</AvatarFallback>
    </Avatar>
  );
}

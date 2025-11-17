import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Star, Target, Award, Zap, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Mock de conquistas
const conquistasMock = [
  {
    id: 1,
    nome: "Primeira Aula",
    descricao: "Complete sua primeira aula",
    desbloqueada: true,
    icon: Star,
  },
  {
    id: 2,
    nome: "Assiduidade",
    descricao: "Compareça a 5 aulas consecutivas",
    desbloqueada: true,
    icon: Trophy,
  },
  {
    id: 3,
    nome: "Dedicado",
    descricao: "Complete 10 tarefas obrigatórias",
    desbloqueada: true,
    icon: Target,
  },
  {
    id: 4,
    nome: "Progresso Rápido",
    descricao: "Atinja 50% de progresso geral",
    desbloqueada: true,
    icon: Zap,
  },
  {
    id: 5,
    nome: "Estudante Modelo",
    descricao: "Complete todas as tarefas de um mês",
    desbloqueada: true,
    icon: Award,
  },
  {
    id: 6,
    nome: "Persistente",
    descricao: "Estude por 3 meses consecutivos",
    desbloqueada: false,
    icon: Heart,
  },
  {
    id: 7,
    nome: "Mestre B1",
    descricao: "Complete todos os tópicos do nível B1",
    desbloqueada: false,
    icon: Trophy,
  },
  {
    id: 8,
    nome: "Comunicador",
    descricao: "Complete todas as atividades de Speaking",
    desbloqueada: false,
    icon: Star,
  },
  {
    id: 9,
    nome: "Escritor",
    descricao: "Complete todas as atividades de Writing",
    desbloqueada: false,
    icon: Target,
  },
  {
    id: 10,
    nome: "Leitor Ávido",
    descricao: "Complete todas as atividades de Reading",
    desbloqueada: false,
    icon: Award,
  },
  {
    id: 11,
    nome: "Ouvinte Atento",
    descricao: "Complete todas as atividades de Listening",
    desbloqueada: false,
    icon: Zap,
  },
  {
    id: 12,
    nome: "Expert em Gramática",
    descricao: "Complete todos os tópicos de Grammar",
    desbloqueada: false,
    icon: Trophy,
  },
  {
    id: 13,
    nome: "Vocabulário Rico",
    descricao: "Complete todos os tópicos de Vocabulary",
    desbloqueada: false,
    icon: Star,
  },
];

export default function AlunoConquistas() {
  const navigate = useNavigate();

  const conquistasDesbloqueadas = conquistasMock.filter((c) => c.desbloqueada);
  const conquistasBloqueadas = conquistasMock.filter((c) => !c.desbloqueada);

  const renderConquista = (conquista: any) => {
    const Icon = conquista.icon;
    return (
      <Card
        key={conquista.id}
        className={`transition-all ${
          conquista.desbloqueada
            ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
            : "opacity-40 grayscale"
        }`}
      >
        <CardContent className="pt-6 text-center">
          <Icon className={`h-12 w-12 mx-auto mb-4 ${
            conquista.desbloqueada ? "text-yellow-500" : "text-muted-foreground"
          }`} />
          <h3 className="font-semibold mb-1">{conquista.nome}</h3>
          <p className="text-sm text-muted-foreground">{conquista.descricao}</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/aluno/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Minhas Conquistas</h1>
            <p className="text-muted-foreground">
              {conquistasDesbloqueadas.length} de {conquistasMock.length} conquistas desbloqueadas
            </p>
          </div>
        </div>

        {/* Conquistas Desbloqueadas */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Desbloqueadas ({conquistasDesbloqueadas.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conquistasDesbloqueadas.map(renderConquista)}
          </div>
        </div>

        {/* Conquistas Bloqueadas */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-muted-foreground" />
            Bloqueadas ({conquistasBloqueadas.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conquistasBloqueadas.map(renderConquista)}
          </div>
        </div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Portal do Aluno</h1>
        <p className="text-muted-foreground">Sistema de gerenciamento de aulas e progresso</p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate("/login")} size="lg">
            Acessar como Admin
          </Button>
          <Button onClick={() => navigate("/aluno/dashboard")} size="lg" variant="outline">
            Acessar como Aluno (Teste)
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;

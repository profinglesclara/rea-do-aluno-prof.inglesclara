import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();

  // 🔥 Executa a função de criar usuários de teste
  useEffect(() => {
    fetch("/functions/v1/criar-usuarios-teste", {
      method: "POST",
    })
      .then((r) => r.json())
      .then((res) => console.log("FUNÇÃO RODADA:", res))
      .catch((err) => console.error("ERRO AO RODAR FUNÇÃO:", err));
  }, []);

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

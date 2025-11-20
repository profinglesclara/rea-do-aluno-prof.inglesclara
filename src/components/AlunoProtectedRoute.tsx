import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AlunoProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Rota protegida para páginas de aluno
 * Permite acesso para:
 * - Usuários com tipo_usuario = 'Aluno'
 * - Usuários com tipo_usuario = 'Admin' (para visualização/acompanhamento)
 * - 🔧 Exceção: usuário de teste (aluno.teste@teste.com),
 *   mesmo que a tabela `usuarios` esteja inconsistente.
 */
const AlunoProtectedRoute = ({ children }: AlunoProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      // 🔧 EXCEÇÃO: liberar sempre o Aluno Teste,
      // independente do que estiver na tabela `usuarios`
      if (session.user.email === "aluno.teste@teste.com") {
        setAuthorized(true);
        setLoading(false);
        return;
      }

      // Fluxo normal: buscar tipo de usuário na tabela `usuarios`
      const { data: userData, error } = await supabase
        .from("usuarios")
        .select("tipo_usuario")
        .eq("user_id", session.user.id)
        .single();

      if (error) {
        console.error("Erro ao buscar tipo de usuário:", error.message);
        setAuthorized(false);
        setLoading(false);
        return;
      }

      if (userData?.tipo_usuario === "Aluno" || userData?.tipo_usuario === "Admin") {
        setAuthorized(true);
      } else {
        setAuthorized(false);
      }

      setLoading(false);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AlunoProtectedRoute;

import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AlunoProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Rota protegida para páginas de aluno
 * Permite acesso apenas para usuários com tipo_usuario = 'Aluno'
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

      // Buscar tipo de usuário na tabela usuarios
      const { data: userData, error } = await supabase
        .from("usuarios")
        .select("tipo_usuario")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar tipo de usuário:", error.message);
        setAuthorized(false);
        setLoading(false);
        return;
      }

      if (userData?.tipo_usuario === "Aluno") {
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

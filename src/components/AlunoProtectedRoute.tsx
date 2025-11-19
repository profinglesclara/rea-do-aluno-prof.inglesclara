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
 */
const AlunoProtectedRoute = ({ children }: AlunoProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      // Buscar tipo de usuário
      const { data: userData } = await supabase
        .from("usuarios")
        .select("tipo_usuario")
        .eq("user_id", session.user.id)
        .single();

      // Permitir acesso para Aluno e Admin
      if (userData?.tipo_usuario === "Aluno" || userData?.tipo_usuario === "Admin") {
        setAuthorized(true);
      } else {
        setAuthorized(false);
      }
      
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
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

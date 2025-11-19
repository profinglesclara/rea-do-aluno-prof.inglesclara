import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AdultoProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Rota protegida para páginas de aluno adulto
 * Permite acesso apenas para usuários com tipo_usuario = 'Adulto'
 */
const AdultoProtectedRoute = ({ children }: AdultoProtectedRouteProps) => {
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

      // Permitir acesso apenas para Adulto
      if (userData?.tipo_usuario === "Adulto") {
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

export default AdultoProtectedRoute;

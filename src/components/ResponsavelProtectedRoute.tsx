import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ResponsavelProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Rota protegida para páginas de responsável
 * Permite acesso para:
 * - Usuários com tipo_usuario = 'Responsável'
 * - Usuários com tipo_usuario = 'Adulto'
 * - Usuários com tipo_usuario = 'Admin' (para visualização/acompanhamento)
 */
const ResponsavelProtectedRoute = ({ children }: ResponsavelProtectedRouteProps) => {
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

      // Permitir acesso para Responsável, Adulto e Admin
      if (
        userData?.tipo_usuario === "Responsável" || 
        userData?.tipo_usuario === "Adulto" || 
        userData?.tipo_usuario === "Admin"
      ) {
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

export default ResponsavelProtectedRoute;

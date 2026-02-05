import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CategoriaAtiva = {
  id: string;
  nome: string;
  ordem: number;
};

/**
 * Hook para buscar apenas categorias ativas do sistema.
 * Usado para filtrar o que deve aparecer em UIs de progresso/relatórios.
 */
export function useCategoriasAtivas() {
  return useQuery<CategoriaAtiva[]>({
    queryKey: ["categoriasAtivas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("id, nome, ordem")
        .eq("ativa", true)
        .order("ordem");

      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000, // 1 minuto
  });
}

/**
 * Retorna um Set com os nomes das categorias ativas para filtro rápido
 */
export function useCategoriasAtivasNomes() {
  const { data: categorias, isLoading, error } = useCategoriasAtivas();
  
  const nomesSet = new Set<string>(
    categorias?.map(c => c.nome) || []
  );

  return {
    categoriasAtivas: nomesSet,
    isLoading,
    error,
    lista: categorias || [],
  };
}

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para sincronizar automaticamente os tópicos do aluno
 * com a fonte da verdade (topicos_padrao + categorias ativas).
 * 
 * Chama sync_topicos_aluno RPC automaticamente ao montar ou quando alunoId muda.
 * NÃO requer clique manual - é auto-sync.
 */
export function useAutoSyncTopicos(alunoId?: string) {
  const hasSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    // Evitar sync duplicado para o mesmo aluno
    if (!alunoId || hasSyncedRef.current === alunoId) return;

    const syncTopicos = async () => {
      try {
        console.log(`[AUTO-SYNC] Sincronizando tópicos para aluno: ${alunoId}`);
        
        const { data, error } = await supabase.rpc("sync_topicos_aluno", {
          p_aluno: alunoId,
        });

        if (error) {
          console.error("[AUTO-SYNC] Erro ao sincronizar tópicos:", error);
          return;
        }

        // Marcar como sincronizado para este aluno
        hasSyncedRef.current = alunoId;
        
        const result = data as any;
        if (result?.inserted > 0 || result?.deleted > 0) {
          console.log(`[AUTO-SYNC] Sync concluído: ${result.inserted} inseridos, ${result.deleted} removidos`);
        }
      } catch (err) {
        console.error("[AUTO-SYNC] Erro inesperado:", err);
      }
    };

    syncTopicos();
  }, [alunoId]);
}

/**
 * Função para executar sync de forma imperativa (ex: antes de gerar PDF)
 * Retorna Promise que resolve quando sync completa.
 */
export async function syncTopicosAluno(alunoId: string): Promise<{ inserted: number; deleted: number } | null> {
  try {
    console.log(`[SYNC] Sincronizando tópicos para aluno: ${alunoId}`);
    
    const { data, error } = await supabase.rpc("sync_topicos_aluno", {
      p_aluno: alunoId,
    });

    if (error) {
      console.error("[SYNC] Erro ao sincronizar tópicos:", error);
      return null;
    }

    const result = data as { inserted: number; deleted: number };
    console.log(`[SYNC] Concluído: ${result?.inserted || 0} inseridos, ${result?.deleted || 0} removidos`);
    return result;
  } catch (err) {
    console.error("[SYNC] Erro inesperado:", err);
    return null;
  }
}

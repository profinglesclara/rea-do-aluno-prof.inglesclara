import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Verify caller is an Admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem excluir usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-deletion
    if (user_id === caller.id) {
      return new Response(
        JSON.stringify({ error: "Você não pode excluir sua própria conta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🗑️ Iniciando exclusão do usuário: ${user_id}`);

    // Delete all related data in order (respecting dependencies)
    const tables = [
      { table: "entregas_tarefas", column: "aluno_id" },
      { table: "tarefas", column: "aluno_id" },
      { table: "conquistas_alunos", column: "aluno_id" },
      { table: "conquistas", column: "aluno" },
      { table: "topicos_progresso", column: "aluno" },
      { table: "aulas", column: "aluno" },
      { table: "relatorios_mensais", column: "aluno" },
      { table: "notificacoes", column: "usuario_id" },
      { table: "responsaveis_alunos", column: "aluno_id" },
      { table: "responsaveis_alunos", column: "responsavel_id" },
      { table: "user_roles", column: "user_id" },
    ];

    for (const { table, column } of tables) {
      const { error: delError } = await supabaseAdmin
        .from(table)
        .delete()
        .eq(column, user_id);

      if (delError) {
        console.warn(`⚠️ Erro ao limpar ${table}.${column}: ${delError.message}`);
      } else {
        console.log(`✅ Limpo: ${table}.${column}`);
      }
    }

    // Delete from usuarios table
    const { error: userDelError } = await supabaseAdmin
      .from("usuarios")
      .delete()
      .eq("user_id", user_id);

    if (userDelError) {
      console.error(`❌ Erro ao excluir da tabela usuarios: ${userDelError.message}`);
      return new Response(
        JSON.stringify({ error: `Erro ao excluir perfil: ${userDelError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete from Supabase Auth
    const { error: authDelError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (authDelError) {
      console.error(`❌ Erro ao excluir do Auth: ${authDelError.message}`);
      return new Response(
        JSON.stringify({ error: `Perfil removido, mas erro no Auth: ${authDelError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Usuário ${user_id} excluído completamente`);

    return new Response(
      JSON.stringify({ success: true, message: "Usuário excluído com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

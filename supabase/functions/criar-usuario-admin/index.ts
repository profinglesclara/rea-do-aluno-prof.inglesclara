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

    const { tipo_usuario, nome_completo, nome_de_usuario, senha, nivel_atual, modalidade, frequencia_mensal } = await req.json();

    console.log("🚀 Criando usuário:", { tipo_usuario, nome_completo, nome_de_usuario });

    // Verificar se nome_de_usuario já existe
    const { data: existingUser } = await supabaseAdmin
      .from("usuarios")
      .select("nome_de_usuario")
      .eq("nome_de_usuario", nome_de_usuario)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Nome de usuário já existe",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Criar email técnico baseado no nome de usuário
    const emailTecnico = `${nome_de_usuario}@portal-aluno.internal`;

    // Criar usuário no Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: emailTecnico,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome_completo,
        nome_de_usuario,
      },
    });

    if (createError) {
      console.error("Erro ao criar usuário no Auth:", createError);
      throw new Error(createError.message);
    }

    // Preparar dados para inserir na tabela usuarios
    const usuarioData: any = {
      user_id: newUser.user.id,
      nome_completo,
      nome_de_usuario,
      email: emailTecnico,
      senha,
      tipo_usuario,
      email_confirmado: true,
    };

    // Adicionar campos específicos para aluno
    if (tipo_usuario === "Aluno") {
      usuarioData.nivel_cefr = nivel_atual;
      usuarioData.modalidade = modalidade;
      usuarioData.frequencia_mensal = frequencia_mensal;
      usuarioData.status_aluno = "Ativo";
    }

    // Inserir na tabela usuarios
    const { error: insertError } = await supabaseAdmin
      .from("usuarios")
      .insert(usuarioData);

    if (insertError) {
      console.error("Erro ao inserir usuário na tabela:", insertError);
      // Reverter criação no Auth
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error(insertError.message);
    }

    console.log("✅ Usuário criado com sucesso!");

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        nome_de_usuario,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("❌ ERRO:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message ?? "Erro desconhecido",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});

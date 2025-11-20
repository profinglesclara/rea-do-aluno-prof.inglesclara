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

    console.log("🚀 Iniciando função criar-usuarios-teste");

    // ============================================================
    // 🔥 1. LIMPEZA DO ALUNO TESTE INVÁLIDO
    // ============================================================
    const INVALID_TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

    // Remover da tabela usuários
    await supabaseAdmin.from("usuarios").delete().eq("user_id", INVALID_TEST_USER_ID);

    // Remover do Auth (se existir)
    const { data: beforeUsers } = await supabaseAdmin.auth.admin.listUsers();
    const fakeUser = beforeUsers?.users?.find((u) => u.id === INVALID_TEST_USER_ID);

    if (fakeUser) {
      await supabaseAdmin.auth.admin.deleteUser(INVALID_TEST_USER_ID);
      console.log("🔥 Usuário inválido removido do Auth.");
    }

    console.log("🔥 Limpeza concluída. Prosseguindo para criação dos usuários reais.");

    // ============================================================
    // 🔥 2. CRIAÇÃO DOS USUÁRIOS DE TESTE
    // ============================================================

    const usuarios = [
      {
        email: "admin@teste.com",
        senha: "admin123",
        nome_completo: "Admin Sistema",
        nome_de_usuario: "admin",
        tipo_usuario: "Admin",
        dados_adicionais: {},
      },
      {
        email: "responsavel.teste@teste.com",
        senha: "123456",
        nome_completo: "Responsável Teste",
        nome_de_usuario: "responsavel_teste",
        tipo_usuario: "Responsável",
        dados_adicionais: {},
        isResponsavel: true,
      },
      {
        email: "aluno.adulto@teste.com",
        senha: "123456",
        nome_completo: "Aluno Adulto Teste",
        nome_de_usuario: "aluno_adulto_teste",
        tipo_usuario: "Adulto",
        dados_adicionais: {
          nivel_cefr: "B1",
          modalidade: "Online",
          status_aluno: "Ativo",
          frequencia_mensal: 4,
          data_inicio_aulas: new Date().toISOString().split("T")[0],
        },
      },
      {
        email: "aluno.teste@teste.com",
        senha: "123456",
        nome_completo: "Aluno Teste",
        nome_de_usuario: "aluno_teste",
        tipo_usuario: "Aluno",
        dados_adicionais: {
          nivel_cefr: "A1",
          modalidade: "Online",
          status_aluno: "Ativo",
          frequencia_mensal: 4,
          data_inicio_aulas: new Date().toISOString().split("T")[0],
        },
        needsResponsavel: true,
      },
    ];

    // Buscar usuários existentes no Auth
    const { data: existingAuth } = await supabaseAdmin.auth.admin.listUsers();
    let responsavelId: string | null = null;
    const resultados = [];

    // Loop principal de criação/atualização
    for (const usuario of usuarios) {
      let userId = null;

      const existingUser = existingAuth?.users?.find((u) => u.email === usuario.email);

      if (existingUser) {
        userId = existingUser.id;

        console.log(`✔ Usuário ${usuario.email} já existe — atualizando senha.`);
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password: usuario.senha,
        });
      } else {
        console.log(`➕ Criando novo usuário no Auth: ${usuario.email}`);

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: usuario.email,
          password: usuario.senha,
          email_confirm: true,
          user_metadata: {
            nome_completo: usuario.nome_completo,
          },
        });

        if (createError) {
          console.error("Erro ao criar usuário:", createError);
          throw new Error(createError.message);
        }

        userId = newUser.user.id;
      }

      if (usuario.isResponsavel) {
        responsavelId = userId;
      }

      const usuarioData: any = {
        user_id: userId,
        nome_completo: usuario.nome_completo,
        nome_de_usuario: usuario.nome_de_usuario,
        email: usuario.email,
        senha: usuario.senha,
        tipo_usuario: usuario.tipo_usuario,
        email_confirmado: true,
        ...usuario.dados_adicionais,
      };

      if (usuario.needsResponsavel && responsavelId) {
        usuarioData.responsavel_por = responsavelId;
      }

      const { data: existsInDb } = await supabaseAdmin
        .from("usuarios")
        .select("user_id")
        .eq("user_id", userId)
        .single();

      if (existsInDb) {
        console.log(`🔄 Atualizando ${usuario.email} na tabela usuarios.`);
        await supabaseAdmin.from("usuarios").update(usuarioData).eq("user_id", userId);
      } else {
        console.log(`🆕 Inserindo ${usuario.email} na tabela usuarios.`);
        await supabaseAdmin.from("usuarios").insert(usuarioData);
      }

      resultados.push({
        email: usuario.email,
        user_id: userId,
        status: existingUser ? "atualizado" : "criado",
      });
    }

    console.log("✨ Processo concluído com sucesso!");

    return new Response(
      JSON.stringify({
        success: true,
        usuarios: resultados,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("❌ ERRO FATAL:", error);

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

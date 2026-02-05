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

    // SECURITY: Verify the caller is authenticated and is an Admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("❌ No authorization header provided");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized: No authorization header",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !callerUser) {
      console.error("❌ Invalid authentication token:", authError?.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized: Invalid token",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    // Check if caller has admin role using the new user_roles table
    const { data: callerRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !callerRole) {
      console.error("❌ Caller is not an admin:", callerUser.id);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Forbidden: Admin access required",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        },
      );
    }

    console.log("✅ Admin authorization verified for user:", callerUser.id);

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

    // Tentar criar usuário no Auth
    let newUser;
    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: emailTecnico,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome_completo,
        nome_de_usuario,
      },
    });

    if (createError) {
      // Se o email já existe no Auth, tentar recuperar o usuário existente
      if (createError.message.includes("already been registered")) {
        console.log("⚠️ Email já existe no Auth, verificando se podemos recuperar o usuário...");
        
        // Buscar usuário existente pelo email
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
          console.error("Erro ao listar usuários:", listError);
          throw new Error("Nome de usuário já existe no sistema de autenticação. Por favor, escolha outro nome.");
        }
        
        const existingAuthUser = listData.users.find(u => u.email === emailTecnico);
        
        if (existingAuthUser) {
          // Verificar se já existe registro na tabela usuarios
          const { data: existingDbUser } = await supabaseAdmin
            .from("usuarios")
            .select("user_id")
            .eq("user_id", existingAuthUser.id)
            .maybeSingle();
          
          if (existingDbUser) {
            // Usuário já existe completamente
            throw new Error("Este nome de usuário já está em uso. Por favor, escolha outro.");
          }
          
          // Usuário existe no Auth mas não na tabela - podemos reutilizar
          console.log("✅ Encontrado usuário órfão no Auth, reutilizando:", existingAuthUser.id);
          
          // Atualizar a senha e metadata do usuário existente
          const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingAuthUser.id,
            {
              password: senha,
              user_metadata: {
                nome_completo,
                nome_de_usuario,
              },
            }
          );
          
          if (updateError) {
            console.error("Erro ao atualizar usuário existente:", updateError);
            throw new Error("Erro ao configurar usuário. Por favor, tente novamente.");
          }
          
          newUser = { user: updatedUser.user };
        } else {
          throw new Error("Nome de usuário já existe no sistema. Por favor, escolha outro.");
        }
      } else {
        console.error("Erro ao criar usuário no Auth:", createError);
        throw new Error(createError.message);
      }
    } else {
      newUser = createdUser;
    }

    // Preparar dados para inserir na tabela usuarios (WITHOUT senha - it's handled by Auth)
    const usuarioData: any = {
      user_id: newUser.user.id,
      nome_completo,
      nome_de_usuario,
      email: emailTecnico,
      tipo_usuario,
      email_confirmado: true,
      // Note: senha is NOT stored here anymore - authentication is handled by Supabase Auth
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

    // Add role to user_roles table
    const roleMapping: { [key: string]: string } = {
      'Admin': 'admin',
      'Aluno': 'aluno',
      'Responsável': 'responsavel',
      'Adulto': 'adulto',
    };

    const { error: roleInsertError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: roleMapping[tipo_usuario] || 'aluno',
      });

    if (roleInsertError) {
      console.error("Erro ao inserir role:", roleInsertError);
      // Don't fail the operation, role can be added later
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

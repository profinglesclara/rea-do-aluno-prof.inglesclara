import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Iniciando criação dos usuários de teste...');

    // Listar todos os usuários para verificar se já existem
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    
    const usuarios = [
      {
        email: 'responsavel.teste@teste.com',
        senha: '123456',
        nome_completo: 'Responsável Teste',
        nome_de_usuario: 'responsavel_teste',
        tipo_usuario: 'Responsável',
        dados_adicionais: {}
      },
      {
        email: 'aluno.adulto@teste.com',
        senha: '123456',
        nome_completo: 'Aluno Adulto Teste',
        nome_de_usuario: 'aluno_adulto_teste',
        tipo_usuario: 'Adulto',
        dados_adicionais: {
          nivel_cefr: 'A1',
          modalidade: 'Online',
          status_aluno: 'Ativo',
          frequencia_mensal: 4
        }
      }
    ];

    const resultados = [];

    for (const usuario of usuarios) {
      // Verificar se usuário já existe
      const existingUser = existingUsers?.users?.find(u => u.email === usuario.email);
      
      let userId: string;
      
      if (existingUser) {
        console.log(`Usuário ${usuario.email} já existe no Auth, usando ID existente:`, existingUser.id);
        userId = existingUser.id;
      } else {
        // Criar novo usuário no Auth
        const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: usuario.email,
          password: usuario.senha,
          email_confirm: true,
          user_metadata: {
            nome_completo: usuario.nome_completo
          }
        });

        if (authError) {
          console.error(`Erro ao criar auth user ${usuario.email}:`, authError);
          throw new Error(`Erro ao criar ${usuario.nome_completo} na auth: ${authError.message}`);
        }

        console.log(`Auth user ${usuario.email} criado:`, newAuthUser.user.id);
        userId = newAuthUser.user.id;
      }

      // Verificar se já existe na tabela usuarios
      const { data: existingUsuario } = await supabaseAdmin
        .from('usuarios')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (existingUsuario) {
        console.log(`Usuário ${usuario.email} já existe na tabela usuarios, atualizando dados...`);
        
        // Atualizar dados do usuário
        const { error: updateError } = await supabaseAdmin
          .from('usuarios')
          .update({
            nome_completo: usuario.nome_completo,
            nome_de_usuario: usuario.nome_de_usuario,
            email: usuario.email,
            senha: usuario.senha,
            tipo_usuario: usuario.tipo_usuario,
            email_confirmado: true,
            ...usuario.dados_adicionais
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error(`Erro ao atualizar usuario ${usuario.email}:`, updateError);
          throw new Error(`Erro ao atualizar ${usuario.nome_completo}: ${updateError.message}`);
        }

        console.log(`Usuario ${usuario.email} atualizado com sucesso`);
      } else {
        console.log(`Inserindo usuário ${usuario.email} na tabela usuarios...`);
        
        // Inserir novo registro na tabela usuarios
        const { error: insertError } = await supabaseAdmin
          .from('usuarios')
          .insert({
            user_id: userId,
            nome_completo: usuario.nome_completo,
            nome_de_usuario: usuario.nome_de_usuario,
            email: usuario.email,
            senha: usuario.senha,
            tipo_usuario: usuario.tipo_usuario,
            email_confirmado: true,
            ...usuario.dados_adicionais
          });

        if (insertError) {
          console.error(`Erro ao inserir usuario ${usuario.email}:`, insertError);
          throw new Error(`Erro ao inserir ${usuario.nome_completo}: ${insertError.message}`);
        }

        console.log(`Usuario ${usuario.email} inserido com sucesso`);
      }

      resultados.push({
        tipo: usuario.nome_completo,
        user_id: userId,
        email: usuario.email,
        senha: usuario.senha,
        status: existingUser ? 'atualizado' : 'criado'
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuários de teste processados com sucesso!',
        usuarios: resultados
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: any) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

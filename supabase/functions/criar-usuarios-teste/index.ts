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

    // Usuário 1: Responsável Teste
    const { data: authUser1, error: authError1 } = await supabaseAdmin.auth.admin.createUser({
      email: 'responsavel.teste@teste.com',
      password: '123456',
      email_confirm: true,
      user_metadata: {
        nome_completo: 'Responsável Teste'
      }
    });

    if (authError1) {
      console.error('Erro ao criar auth user 1:', authError1);
      throw new Error(`Erro ao criar Responsável Teste na auth: ${authError1.message}`);
    }

    console.log('Auth user 1 criado:', authUser1.user.id);

    // Inserir na tabela usuarios - Responsável
    const { error: insertError1 } = await supabaseAdmin
      .from('usuarios')
      .insert({
        user_id: authUser1.user.id,
        nome_completo: 'Responsável Teste',
        nome_de_usuario: 'responsavel_teste',
        email: 'responsavel.teste@teste.com',
        senha: '123456',
        tipo_usuario: 'Responsável',
        email_confirmado: true
      });

    if (insertError1) {
      console.error('Erro ao inserir usuario 1:', insertError1);
      throw new Error(`Erro ao inserir Responsável Teste: ${insertError1.message}`);
    }

    console.log('Usuario 1 inserido com sucesso');

    // Usuário 2: Aluno Adulto Teste
    const { data: authUser2, error: authError2 } = await supabaseAdmin.auth.admin.createUser({
      email: 'aluno.adulto@teste.com',
      password: '123456',
      email_confirm: true,
      user_metadata: {
        nome_completo: 'Aluno Adulto Teste'
      }
    });

    if (authError2) {
      console.error('Erro ao criar auth user 2:', authError2);
      throw new Error(`Erro ao criar Aluno Adulto na auth: ${authError2.message}`);
    }

    console.log('Auth user 2 criado:', authUser2.user.id);

    // Inserir na tabela usuarios - Adulto
    const { error: insertError2 } = await supabaseAdmin
      .from('usuarios')
      .insert({
        user_id: authUser2.user.id,
        nome_completo: 'Aluno Adulto Teste',
        nome_de_usuario: 'aluno_adulto_teste',
        email: 'aluno.adulto@teste.com',
        senha: '123456',
        tipo_usuario: 'Adulto',
        nivel_cefr: 'A1',
        modalidade: 'Online',
        status_aluno: 'Ativo',
        frequencia_mensal: 4,
        email_confirmado: true
      });

    if (insertError2) {
      console.error('Erro ao inserir usuario 2:', insertError2);
      throw new Error(`Erro ao inserir Aluno Adulto: ${insertError2.message}`);
    }

    console.log('Usuario 2 inserido com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuários de teste criados com sucesso!',
        usuarios: [
          {
            tipo: 'Responsável Teste',
            user_id: authUser1.user.id,
            email: 'responsavel.teste@teste.com',
            senha: '123456'
          },
          {
            tipo: 'Aluno Adulto Teste',
            user_id: authUser2.user.id,
            email: 'aluno.adulto@teste.com',
            senha: '123456'
          }
        ]
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

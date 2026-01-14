import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Iniciando geração de relatórios mensais');

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calcular mês anterior
    const dataAtual = new Date();
    const mesAnterior = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - 1, 1);
    const mesReferencia = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}`;
    
    console.log(`📅 Mês de referência: ${mesReferencia}`);

    // Buscar alunos ativos com nível CEFR definido
    const { data: alunos, error: alunosError } = await supabase
      .from('usuarios')
      .select('user_id, nome_completo, nivel_cefr, progresso_geral, progresso_por_categoria, historico_progresso')
      .in('tipo_usuario', ['Aluno', 'Adulto'])
      .eq('status_aluno', 'Ativo')
      .not('nivel_cefr', 'is', null);

    if (alunosError) {
      console.error('❌ Erro ao buscar alunos:', alunosError);
      throw alunosError;
    }

    console.log(`👥 Encontrados ${alunos?.length || 0} alunos ativos com nível CEFR`);

    const resultados = {
      sucesso: 0,
      erros: 0,
      detalhes: [] as any[]
    };

    // Processar cada aluno
    for (const aluno of alunos || []) {
      try {
        console.log(`\n📊 Processando aluno: ${aluno.nome_completo} (${aluno.user_id}) - Nível ${aluno.nivel_cefr}`);

        // Buscar progresso atualizado filtrando pelo nível CEFR atual
        const { data: progressoData, error: progressoError } = await supabase
          .rpc('get_progresso_aluno', { p_aluno: aluno.user_id });

        if (progressoError) {
          console.error(`  ❌ Erro ao buscar progresso:`, progressoError);
          throw progressoError;
        }

        const progresso = progressoData || {};
        const progressoGeral = Number(progresso.progresso_geral) || 0;
        const progressoPorCategoria = progresso.progresso_por_categoria || {};
        const totalTopicos = Number(progresso.total_topicos) || 0;
        const concluidos = Number(progresso.concluidos) || 0;
        const emDesenvolvimento = Number(progresso.em_desenvolvimento) || 0;

        // Calcular porcentagens baseadas no nível CEFR atual
        const porcentagemConcluida = totalTopicos > 0 ? (concluidos / totalTopicos) * 100 : 0;
        const porcentagemEmDesenvolvimento = totalTopicos > 0 ? (emDesenvolvimento / totalTopicos) * 100 : 0;

        console.log(`  📈 Nível ${aluno.nivel_cefr}: ${totalTopicos} tópicos | Progresso: ${progressoGeral}% | Concluídos: ${concluidos} (${porcentagemConcluida.toFixed(2)}%) | Em dev: ${emDesenvolvimento} (${porcentagemEmDesenvolvimento.toFixed(2)}%)`);

        // Gerar conteúdo textual (incluindo nível CEFR)
        const conteudoGerado = gerarConteudoTexto(
          aluno.nome_completo,
          aluno.nivel_cefr,
          progressoGeral,
          progressoPorCategoria,
          porcentagemConcluida,
          porcentagemEmDesenvolvimento,
          totalTopicos,
          concluidos,
          emDesenvolvimento
        );

        // Gerar comentário automático com IA (incluindo nível CEFR)
        console.log('  🤖 Gerando comentário com IA...');
        const comentarioAutomatico = await gerarComentarioIA(
          lovableApiKey,
          aluno.nome_completo,
          aluno.nivel_cefr,
          progressoGeral,
          progressoPorCategoria,
          porcentagemConcluida,
          porcentagemEmDesenvolvimento
        );

        console.log(`  💬 Comentário gerado: ${comentarioAutomatico.substring(0, 50)}...`);

        // Inserir relatório
        const { error: insertError } = await supabase
          .from('relatorios_mensais')
          .insert({
            aluno: aluno.user_id,
            mes_referencia: mesReferencia,
            data_geracao: new Date().toISOString(),
            conteudo_gerado: conteudoGerado,
            porcentagem_concluida: Math.round(porcentagemConcluida * 100) / 100,
            porcentagem_em_desenvolvimento: Math.round(porcentagemEmDesenvolvimento * 100) / 100,
            comentario_automatico: comentarioAutomatico,
            arquivo_pdf: null
          });

        if (insertError) {
          console.error(`  ❌ Erro ao inserir relatório:`, insertError);
          resultados.erros++;
          resultados.detalhes.push({
            aluno: aluno.nome_completo,
            erro: insertError.message
          });
        } else {
          console.log(`  ✅ Relatório gerado com sucesso`);
          resultados.sucesso++;
          resultados.detalhes.push({
            aluno: aluno.nome_completo,
            sucesso: true
          });
        }

      } catch (erro: any) {
        console.error(`  ❌ Erro ao processar aluno ${aluno.nome_completo}:`, erro);
        resultados.erros++;
        resultados.detalhes.push({
          aluno: aluno.nome_completo,
          erro: erro.message
        });
      }
    }

    console.log('\n✨ Processo finalizado');
    console.log(`  ✅ Sucessos: ${resultados.sucesso}`);
    console.log(`  ❌ Erros: ${resultados.erros}`);

    return new Response(
      JSON.stringify({
        mensagem: 'Relatórios mensais gerados',
        mes_referencia: mesReferencia,
        total_alunos: alunos?.length || 0,
        ...resultados
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('💥 Erro fatal:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        detalhes: 'Erro ao gerar relatórios mensais'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function gerarConteudoTexto(
  nome: string,
  nivelCefr: string,
  progressoGeral: number,
  progressoPorCategoria: any,
  porcentagemConcluida: number,
  porcentagemEmDesenvolvimento: number,
  totalTopicos: number,
  concluidos: number,
  emDesenvolvimento: number
): string {
  let conteudo = `Relatório de Progresso - ${nome}\n`;
  conteudo += `Nível CEFR: ${nivelCefr}\n\n`;
  conteudo += `Progresso Geral: ${progressoGeral}%\n`;
  conteudo += `Total de tópicos no nível: ${totalTopicos}\n`;
  conteudo += `Tópicos concluídos: ${concluidos} (${porcentagemConcluida.toFixed(2)}%)\n`;
  conteudo += `Tópicos em desenvolvimento: ${emDesenvolvimento} (${porcentagemEmDesenvolvimento.toFixed(2)}%)\n\n`;
  
  if (typeof progressoPorCategoria === 'object' && progressoPorCategoria !== null) {
    conteudo += `Progresso por Categoria (Nível ${nivelCefr}):\n`;
    // Lista fixa das 7 categorias
    const categoriasFixas = ['Phonetics', 'Grammar', 'Vocabulary', 'Communication', 'Expressions', 'Pronunciation', 'Listening'];
    
    for (const categoria of categoriasFixas) {
      const cat = progressoPorCategoria[categoria] as any;
      const total = cat?.total || 0;
      const catConcluidos = cat?.concluidos || 0;
      const catEmDev = cat?.em_desenvolvimento || 0;
      const percentual = cat?.percentual_concluido || 0;
      
      conteudo += `\n${categoria}:\n`;
      if (total > 0) {
        conteudo += `  - Total de tópicos: ${total}\n`;
        conteudo += `  - Concluídos: ${catConcluidos}\n`;
        conteudo += `  - Em desenvolvimento: ${catEmDev}\n`;
        conteudo += `  - Percentual concluído: ${percentual}%\n`;
      } else {
        conteudo += `  - Sem tópicos configurados para este nível\n`;
      }
    }
  }

  return conteudo;
}

async function gerarComentarioIA(
  apiKey: string,
  nome: string,
  nivelCefr: string,
  progressoGeral: number,
  progressoPorCategoria: any,
  porcentagemConcluida: number,
  porcentagemEmDesenvolvimento: number
): Promise<string> {
  try {
    // Extrair primeiro nome
    const primeiroNome = nome.split(' ')[0];
    
    // Preparar dados das categorias de forma legível
    let categoriasMelhorDesempenho = '';
    let categoriasAMelhorar = '';
    
    if (typeof progressoPorCategoria === 'object' && progressoPorCategoria !== null) {
      const categoriasArray = Object.entries(progressoPorCategoria)
        .filter(([_, dados]: [string, any]) => (dados?.total || 0) > 0) // Só categorias com tópicos
        .map(([nome, dados]: [string, any]) => ({
          nome,
          concluido: dados?.percentual_concluido || 0,
          emDesenvolvimento: dados?.percentual_em_desenvolvimento || 0
        }))
        .sort((a, b) => b.concluido - a.concluido);
      
      if (categoriasArray.length > 0) {
        // Top 2-3 categorias com melhor desempenho
        categoriasMelhorDesempenho = categoriasArray
          .slice(0, Math.min(3, categoriasArray.length))
          .map(c => `${c.nome} (${c.concluido.toFixed(0)}% concluído)`)
          .join(', ');
        
        // Bottom 1-2 categorias para desenvolver
        categoriasAMelhorar = categoriasArray
          .slice(-2)
          .map(c => `${c.nome} (${c.concluido.toFixed(0)}% concluído)`)
          .join(', ');
      }
    }
    
    const prompt = `Você é uma professora de inglês experiente e acolhedora. Gere um comentário personalizado sobre o progresso mensal do aluno seguindo EXATAMENTE este formato:

DADOS DO ALUNO:
Nome: ${nome}
Primeiro nome: ${primeiroNome}
Nível CEFR: ${nivelCefr}
Progresso Geral: ${progressoGeral}%
Percentual Concluído: ${porcentagemConcluida.toFixed(2)}%
Percentual Em Desenvolvimento: ${porcentagemEmDesenvolvimento.toFixed(2)}%
Categorias com melhor desempenho: ${categoriasMelhorDesempenho}
Categorias a desenvolver: ${categoriasAMelhorar}

FORMATO OBRIGATÓRIO DO COMENTÁRIO:

1. SAUDAÇÃO: Comece com uma saudação personalizada usando o primeiro nome do aluno.

2. PARÁGRAFO 1 - RESUMO DO MÊS: Uma frase curta e acolhedora explicando como foi o mês de estudos do aluno.

3. PARÁGRAFO 2 - PONTOS FORTES: Destaque as categorias em que o aluno teve melhor desempenho. Use **negrito** (formato markdown) para os nomes das categorias. Exemplo: "Você teve um ótimo desempenho em **Grammar** e **Vocabulary**..."

4. PARÁGRAFO 3 - PONTOS A DESENVOLVER: Com tom encorajador, cite uma ou duas categorias com desempenho mais baixo, dando sugestões simples de como melhorar. Exemplo: "Para o próximo mês, vamos dar atenção especial a **Listening**..."

5. PARÁGRAFO 4 - PRÓXIMOS PASSOS: Uma frase sobre o foco principal do próximo mês (revisar conteúdo ou avançar para novos tópicos).

6. ENCERRAMENTO: Frase curta e motivadora. Exemplo: "Parabéns pelo seu esforço, vamos continuar juntos nessa jornada!"

REGRAS IMPORTANTES:
- Use linguagem em português brasileiro
- Tom amigável e profissional, como professora particular falando com o aluno
- NÃO use porcentagens exatas no texto, fale de forma qualitativa (ótimo desempenho, ainda em desenvolvimento, etc.)
- NÃO mencione nomes de tabelas ou termos técnicos
- O texto deve ter 4-5 parágrafos curtos
- Use os nomes das categorias em negrito (markdown **categoria**)
- Seja específica e personalizada com base nos dados fornecidos`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é uma professora de inglês experiente, acolhedora e motivadora. Você escreve comentários personalizados para seus alunos seguindo um formato estruturado específico.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API de IA:', response.status, errorText);
      return gerarComentarioPadrao(porcentagemConcluida);
    }

    const data = await response.json();
    const comentario = data.choices?.[0]?.message?.content || gerarComentarioPadrao(porcentagemConcluida);
    
    return comentario.trim();

  } catch (erro) {
    console.error('Erro ao gerar comentário com IA:', erro);
    return gerarComentarioPadrao(porcentagemConcluida);
  }
}

function gerarComentarioPadrao(porcentagemConcluida: number): string {
  if (porcentagemConcluida < 40) {
    return 'O aluno está em fase inicial de consolidação dos conteúdos deste nível. Continue praticando e os resultados virão!';
  } else if (porcentagemConcluida < 70) {
    return 'O aluno apresenta progresso consistente. Continue assim, está no caminho certo!';
  } else {
    return 'Excelente progresso! O aluno demonstra bom domínio dos conteúdos trabalhados.';
  }
}

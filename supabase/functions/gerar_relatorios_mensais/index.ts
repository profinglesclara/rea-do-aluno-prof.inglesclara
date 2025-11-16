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

    // Buscar alunos ativos
    const { data: alunos, error: alunosError } = await supabase
      .from('usuarios')
      .select('user_id, nome_completo, progresso_geral, progresso_por_categoria, historico_progresso')
      .eq('tipo_usuario', 'Aluno')
      .eq('status_aluno', 'Ativo');

    if (alunosError) {
      console.error('❌ Erro ao buscar alunos:', alunosError);
      throw alunosError;
    }

    console.log(`👥 Encontrados ${alunos?.length || 0} alunos ativos`);

    const resultados = {
      sucesso: 0,
      erros: 0,
      detalhes: [] as any[]
    };

    // Processar cada aluno
    for (const aluno of alunos || []) {
      try {
        console.log(`\n📊 Processando aluno: ${aluno.nome_completo} (${aluno.user_id})`);

        // Valores seguros com fallback
        const progressoGeral = aluno.progresso_geral || 0;
        const progressoPorCategoria = aluno.progresso_por_categoria || {};
        const historicoProgresso = aluno.historico_progresso || [];

        // Calcular porcentagens
        let porcentagemConcluida = 0;
        let porcentagemEmDesenvolvimento = 0;

        if (typeof progressoPorCategoria === 'object' && progressoPorCategoria !== null) {
          const categorias = Object.values(progressoPorCategoria);
          if (categorias.length > 0) {
            const totalConcluidos = categorias.reduce((acc: number, cat: any) => 
              acc + (cat?.percentual_concluido || 0), 0);
            const totalEmDesenvolvimento = categorias.reduce((acc: number, cat: any) => 
              acc + (cat?.percentual_em_desenvolvimento || 0), 0);
            
            porcentagemConcluida = totalConcluidos / categorias.length;
            porcentagemEmDesenvolvimento = totalEmDesenvolvimento / categorias.length;
          }
        }

        console.log(`  📈 Progresso: ${progressoGeral}% | Concluída: ${porcentagemConcluida.toFixed(2)}% | Em desenvolvimento: ${porcentagemEmDesenvolvimento.toFixed(2)}%`);

        // Gerar conteúdo textual
        const conteudoGerado = gerarConteudoTexto(
          aluno.nome_completo,
          progressoGeral,
          progressoPorCategoria,
          porcentagemConcluida,
          porcentagemEmDesenvolvimento
        );

        // Gerar comentário automático com IA
        console.log('  🤖 Gerando comentário com IA...');
        const comentarioAutomatico = await gerarComentarioIA(
          lovableApiKey,
          aluno.nome_completo,
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
  progressoGeral: number,
  progressoPorCategoria: any,
  porcentagemConcluida: number,
  porcentagemEmDesenvolvimento: number
): string {
  let conteudo = `Relatório de Progresso - ${nome}\n\n`;
  conteudo += `Progresso Geral: ${progressoGeral}%\n\n`;
  conteudo += `Resumo:\n`;
  conteudo += `- Percentual Concluído: ${porcentagemConcluida.toFixed(2)}%\n`;
  conteudo += `- Percentual Em Desenvolvimento: ${porcentagemEmDesenvolvimento.toFixed(2)}%\n\n`;
  
  if (typeof progressoPorCategoria === 'object' && progressoPorCategoria !== null) {
    conteudo += `Progresso por Categoria:\n`;
    for (const [categoria, dados] of Object.entries(progressoPorCategoria)) {
      const cat = dados as any;
      conteudo += `\n${categoria}:\n`;
      conteudo += `  - Total de tópicos: ${cat?.total || 0}\n`;
      conteudo += `  - Concluídos: ${cat?.concluidos || 0}\n`;
      conteudo += `  - Em desenvolvimento: ${cat?.em_desenvolvimento || 0}\n`;
      conteudo += `  - Percentual concluído: ${cat?.percentual_concluido || 0}%\n`;
    }
  }

  return conteudo;
}

async function gerarComentarioIA(
  apiKey: string,
  nome: string,
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

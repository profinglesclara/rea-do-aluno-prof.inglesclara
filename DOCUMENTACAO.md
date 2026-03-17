# 📘 Documentação Completa do Sistema — Portal do Aluno

> **Versão:** 1.0  
> **Última atualização:** 17 de março de 2026  
> **Stack:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui + Lovable Cloud (Supabase)

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Tipos de Usuário e Permissões](#3-tipos-de-usuário-e-permissões)
4. [Autenticação e Login](#4-autenticação-e-login)
5. [Criação de Usuários](#5-criação-de-usuários)
6. [Painel do Administrador](#6-painel-do-administrador)
7. [Painel do Aluno](#7-painel-do-aluno)
8. [Painel do Responsável](#8-painel-do-responsável)
9. [Sistema de Progresso e Currículo](#9-sistema-de-progresso-e-currículo)
10. [Sistema de Aulas](#10-sistema-de-aulas)
11. [Sistema de Tarefas](#11-sistema-de-tarefas)
12. [Sistema de Conquistas](#12-sistema-de-conquistas)
13. [Sistema de Notificações](#13-sistema-de-notificações)
14. [Relatórios Mensais](#14-relatórios-mensais)
15. [Perfil e Foto](#15-perfil-e-foto)
16. [Segurança e RLS](#16-segurança-e-rls)
17. [Edge Functions](#17-edge-functions)
18. [Banco de Dados — Tabelas](#18-banco-de-dados--tabelas)
19. [Banco de Dados — Funções e Triggers](#19-banco-de-dados--funções-e-triggers)
20. [Storage (Armazenamento)](#20-storage-armazenamento)
21. [Rotas da Aplicação](#21-rotas-da-aplicação)

---

## 1. Visão Geral

O **Portal do Aluno** é uma plataforma de gestão educacional para aulas de inglês. Permite que um professor (Admin) gerencie alunos, aulas, tarefas, conquistas, progresso curricular e relatórios mensais. Alunos acompanham seu progresso e entregam tarefas. Responsáveis visualizam o desempenho dos alunos vinculados.

---

## 2. Arquitetura do Sistema

### Camadas de Identidade e Permissões

O sistema utiliza **três camadas**:

| Camada | Tabela/Serviço | Responsabilidade |
|--------|---------------|------------------|
| 1 — Autenticação | `auth.users` (Supabase Auth) | Sessão, tokens, senha |
| 2 — Perfil e Roteamento | `public.usuarios` | Dados do perfil, campo `tipo_usuario` para roteamento |
| 3 — RLS (Segurança) | `public.user_roles` | Controle de acesso via `has_role()` e enum `app_role` |

### Fluxo de Dados

```
Login → Edge Function (lookup-user) → Supabase Auth → Roteamento por tipo_usuario
                                                      ↓
                                            Admin → /admin/dashboard
                                            Aluno → /aluno/dashboard
                                            Responsável → /responsavel/dashboard
```

---

## 3. Tipos de Usuário e Permissões

### Tipos (`tipo_usuario` enum)

| Tipo | Descrição | Acesso |
|------|-----------|--------|
| **Admin** | Professor/administrador | Acesso total a todas as interfaces |
| **Aluno** | Estudante | Portal do aluno (progresso, tarefas, conquistas, aulas, calendário) |
| **Responsável** | Pai/mãe/tutor | Portal do responsável (visualizar alunos vinculados) |
| **Adulto** | Aluno adulto (legado) | Tratado como Aluno sem responsável |

### Roles RLS (`app_role` enum)

| Role | Mapeamento |
|------|-----------|
| `admin` | Admin |
| `aluno` | Aluno |
| `responsavel` | Responsável |
| `adulto` | Adulto |

### Regra de Distinção Aluno Criança vs. Adulto

A distinção **não** é feita por tipo de usuário, mas sim pela **presença ou ausência de um Responsável vinculado** na tabela `responsaveis_alunos`. Se o aluno tem responsável vinculado, é considerado criança/adolescente; se não tem, é considerado adulto.

---

## 4. Autenticação e Login

### Página de Login (`/login`)

- **Campo único** aceita nome de usuário ou e-mail
- Fluxo:
  1. Chama Edge Function `lookup-user` com o identificador
  2. A function busca na tabela `usuarios` por `nome_de_usuario` ou `email`
  3. Retorna o e-mail associado e o `tipo_usuario`
  4. Faz login no Supabase Auth com o e-mail retornado + senha digitada
  5. Redireciona conforme `tipo_usuario`

### Regras

- **Não existe cadastro público** — apenas o Admin cria usuários
- Senhas são gerenciadas exclusivamente pelo Supabase Auth
- A coluna `senha` foi **permanentemente removida** da tabela `usuarios`
- E-mails técnicos são gerados como `{nome_de_usuario}@portal-aluno.internal`

---

## 5. Criação de Usuários

### Quem pode criar: Apenas **Admin**

### Rota: `/admin/criar-usuario`

### Edge Function: `criar-usuario-admin`

### Fluxo de Criação

1. Admin preenche: Tipo de usuário, Nome completo, Nome de usuário, Senha inicial
2. Para Alunos: campos adicionais — Nível CEFR, Modalidade, Frequência mensal
3. Edge Function:
   - Verifica que o chamador é Admin (via `user_roles`)
   - Verifica unicidade do `nome_de_usuario`
   - Cria e-mail técnico: `{nome_de_usuario}@portal-aluno.internal`
   - Cria usuário no Supabase Auth (com `email_confirm: true`)
   - Insere registro na tabela `usuarios`
   - Insere role na tabela `user_roles`

### Campos Obrigatórios por Tipo

| Campo | Aluno | Responsável |
|-------|-------|-------------|
| Nome completo | ✅ | ✅ |
| Nome de usuário | ✅ | ✅ |
| Senha inicial | ✅ | ✅ |
| Nível CEFR | ✅ | ❌ |
| Modalidade | ✅ | ❌ |
| Frequência mensal | ✅ | ❌ |

### Pós-criação do Aluno (Triggers Automáticos)

- Tópicos do nível CEFR são populados automaticamente (`popular_topicos_iniciais`)
- Flags de interface são configuradas (`configurar_flags_cards_aluno`)

---

## 6. Painel do Administrador

### Dashboard Principal (`/admin/dashboard`)

- Lista de todos os alunos com cards resumo
- Filtros: busca por nome, filtro por status (`Ativo`, `Em pausa`, `Cancelado`, `Inativo`)
- Informações por aluno: nível CEFR, modalidade, progresso geral, próxima aula, tarefas pendentes, total de conquistas
- Botão para criar novo usuário
- Botões de gerenciamento: Categorias, Tópicos Padrão, Vínculos

### Páginas Administrativas

| Rota | Funcionalidade |
|------|---------------|
| `/admin/dashboard` | Dashboard com lista de alunos |
| `/admin/aulas` | Gerenciar aulas de todos os alunos |
| `/admin/calendario-aulas` | Calendário visual de aulas |
| `/admin/tarefas` | Gerenciar tarefas de todos os alunos |
| `/admin/conquistas` | Gerenciar conquistas mestre |
| `/admin/relatorios` | Gerar e visualizar relatórios mensais |
| `/admin/responsaveis` | Gerenciar responsáveis e vínculos |
| `/admin/criar-usuario` | Criar novo aluno ou responsável |
| `/admin/aluno/:aluno_id` | Detalhes completos de um aluno |
| `/admin/notificacoes` | Notificações do admin |

### Gerenciamento de Currículo

- **Categorias**: Adicionar, renomear, reordenar, ativar/desativar categorias curriculares
- **Tópicos Padrão**: Adicionar, editar, remover tópicos por nível CEFR
- Renomear uma categoria propaga automaticamente para todos os tópicos e progressos

### Gerenciamento de Vínculos

- Vincular/desvincular Responsável ↔ Aluno via tabela `responsaveis_alunos`
- Validação por trigger: responsável deve ter `tipo_usuario = 'Responsável'`, aluno deve ter `tipo_usuario = 'Aluno'`

---

## 7. Painel do Aluno

### Dashboard (`/aluno/dashboard`)

- Card de boas-vindas com nome, nível CEFR, modalidade
- Progresso geral e por categoria
- Resumo de aulas (total, concluídas, agendadas, próxima aula)
- Tarefas pendentes (obrigatórias e sugeridas)
- Total de conquistas

### Páginas do Aluno

| Rota | Funcionalidade |
|------|---------------|
| `/aluno/dashboard` | Dashboard principal |
| `/aluno/progresso` | Progresso detalhado por categoria e tópico |
| `/aluno/tarefas` | Lista de tarefas |
| `/aluno/tarefas/:tarefa_id` | Detalhes e entrega de tarefa |
| `/aluno/conquistas` | Medalhas e conquistas |
| `/aluno/calendario` | Calendário de aulas |
| `/aluno/aulas` | Lista de aulas |
| `/aluno/notificacoes` | Notificações |

### Visibilidade Condicional de Cards

Flags booleanas controlam visibilidade de seções:

| Flag | Default (com responsável) | Default (sem responsável) |
|------|--------------------------|--------------------------|
| `show_relatorios` | `false` | `true` |
| `show_pagamentos` | `false` | `true` |
| `show_contratos` | `false` | `true` |

O Admin pode sobrescrever esses valores manualmente.

---

## 8. Painel do Responsável

### Dashboard (`/responsavel/dashboard`)

- Lista de alunos vinculados com cards resumo
- Cada card mostra: nome, nível CEFR, modalidade, progresso, aulas, tarefas pendentes, conquistas
- Botão para acessar detalhes de cada aluno

### Páginas do Responsável

| Rota | Funcionalidade |
|------|---------------|
| `/responsavel/dashboard` | Dashboard com alunos vinculados |
| `/responsavel/aluno/:aluno_id` | Detalhes completos do aluno |
| `/responsavel/notificacoes` | Notificações (espelhadas do aluno) |
| `/responsavel/relatorios` | Relatórios dos alunos vinculados |

### Acesso do Responsável

- Só visualiza dados dos alunos vinculados via `responsaveis_alunos`
- RLS garante acesso via função `is_responsavel_of(auth.uid(), aluno_id)`
- **Não pode editar** dados dos alunos — apenas visualizar

---

## 9. Sistema de Progresso e Currículo

### Estrutura

```
categorias (ex: Grammar, Vocabulary, Speaking...)
    └── topicos_padrao (modelo por nível CEFR)
            └── topicos_progresso (instância por aluno)
```

### Níveis CEFR

`A1` | `A2` | `B1` | `B2` | `C1` | `C2`

### Status de Tópico

| Status | Valor Numérico | Cor |
|--------|---------------|-----|
| `A Introduzir` | 0 | — |
| `Em Desenvolvimento` | 0.5 | Amarelo |
| `Concluído` | 1 | Verde |

### Categorias Dinâmicas

- Gerenciadas na tabela `categorias` (nome, ordem, ativa)
- Categorias padrão: Grammar, Vocabulary, Communication, Pronunciation, Listening, Reading, Writing, Speaking, Phonetics, Expressions

### Cálculo de Progresso

- **Apenas do nível CEFR atual** — histórico de níveis anteriores não influencia
- `progresso_geral` = (tópicos concluídos / total de tópicos) × 100
- Calculado em tempo real pela função `get_progresso_aluno()`
- Recalculado automaticamente pelo trigger `recalcular_progresso_aluno()` a cada alteração de tópico
- Armazenado na tabela `usuarios` nos campos `progresso_geral` e `progresso_por_categoria`

### Sincronização Automática

- Ao criar/editar/remover um `topico_padrao`, os triggers propagam para todos os alunos do nível correspondente
- Ao mudar o nível CEFR de um aluno, tópicos do novo nível são populados automaticamente
- A função `sync_topicos_aluno()` pode ser chamada manualmente para sincronizar

---

## 10. Sistema de Aulas

### Tabela: `aulas`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `aula_id` | UUID | Identificador |
| `aluno` | UUID | Referência ao aluno |
| `data_aula` | Timestamp | Data e hora da aula |
| `status` | Enum | `Agendada`, `Realizada`, `Cancelada`, `Remarcada` |
| `conteudo` | Text | Conteúdo da aula |
| `observacoes` | Text | Observações |

### Views

- `resumo_aulas_por_aluno`: Totais agregados de aulas por aluno (total, concluídas, agendadas, canceladas, remarcadas, próxima aula)
- `dashboard_resumo_alunos`: View consolidada para o dashboard admin

### Regras

- Apenas **Admin** pode criar, editar e deletar aulas
- Alunos e Responsáveis podem **apenas visualizar**
- A mudança de status para `Realizada` dispara verificação de conquistas automáticas

---

## 11. Sistema de Tarefas

### Tabela: `tarefas`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador |
| `aluno_id` | UUID | Referência ao aluno |
| `titulo` | Text | Título da tarefa |
| `descricao` | Text | Descrição |
| `tipo` | Text | `Obrigatoria` ou `Sugerida` |
| `status` | Text | `Pendente`, `Entregue`, `Corrigida` |
| `data_limite` | Timestamp | Data limite (opcional) |
| `url_enunciado` | Text | URL do PDF de enunciado (Admin) |
| `feedback_professor` | Text | Feedback do professor (obrigatório para corrigir) |

### Tabela: `entregas_tarefas`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador |
| `tarefa_id` | UUID | Referência à tarefa |
| `aluno_id` | UUID | Referência ao aluno |
| `url_pdf` | Text | URL do PDF entregue |
| `comentario` | Text | Comentário opcional do aluno |
| `data_envio` | Timestamp | Data do envio |

### Fluxo da Tarefa

```
Admin cria tarefa (Pendente)
    ↓ Notificação enviada ao aluno
Aluno entrega PDF + comentário (Entregue)
    ↓ Notificação enviada ao admin + e-mail
Admin escreve feedback + marca como Corrigida
    ↓ Notificação enviada ao aluno
Aluno visualiza correção e feedback
```

### Regras

- **Tarefas Obrigatórias**: Criadas pelo Admin, geram notificação ao aluno
- **Tarefas Sugeridas**: Criadas pelo Admin como sugestão, sem notificação automática
- Aluno faz upload de PDF (multi-arquivo) com UX de dois passos (selecionar → enviar)
- Comentário do aluno é **opcional** na entrega
- Feedback do professor é **obrigatório** para marcar como `Corrigida`
- Aluno **não pode** criar entregas manualmente
- Responsável pode **apenas visualizar** tarefas dos alunos vinculados

---

## 12. Sistema de Conquistas

### Estrutura

```
conquistas_mestre (catálogo de conquistas disponíveis)
    └── conquistas_alunos (conquistas desbloqueadas por cada aluno)
```

### Tabela: `conquistas_mestre`

| Campo | Descrição |
|-------|-----------|
| `nome` | Nome da conquista |
| `descricao` | Descrição |
| `icone` | Nome do ícone Lucide (ex: `Trophy`, `Star`, `Award`) |
| `slug` | Identificador único para automação |
| `tipo` | `GERAL` ou `NIVEL` |
| `nivel_cefr` | Nível CEFR (apenas para tipo `NIVEL`) |
| `automacao` | Se é desbloqueada automaticamente |
| `ativa` | Se está visível |
| `ordem_exibicao` | Ordem na interface |

### Conquistas Automáticas (Regras)

| Slug | Conquista | Condição |
|------|-----------|----------|
| `primeira_aula` | Primeira Aula | Primeira aula com status `Realizada` |
| `assiduidade` | Assiduidade | 5 aulas consecutivas `Realizada` |
| `dedicado` | Dedicado | 10 tarefas com status `Entregue` ou `Corrigida` |
| `progresso_rapido` | Progresso Rápido | Progresso geral ≥ 50% |
| `persistente` | Persistente | 3 meses desde a primeira aula `Realizada` |
| `mestre_{nivel}` | Mestre [Nível] | 100% de progresso nos tópicos de um nível CEFR |

### Desbloqueio Automático

- Triggers verificam condições em tempo real ao alterar aulas, tarefas ou progresso
- Funções: `verificar_conquistas_automaticas()` e `verificar_conquistas_nivel()`
- Ao desbloquear, gera notificação automática `CONQUISTA_DESBLOQUEADA`

### Desbloqueio Manual

- Admin pode desbloquear qualquer conquista manualmente para qualquer aluno

### Visualização

- Alunos veem conquistas do tipo `GERAL` + as do seu nível CEFR atual
- Conquistas desbloqueadas: coloridas | Bloqueadas: escala de cinza
- Ícones renderizados via mapeamento Lucide React (Star, Trophy, Target, Award, Zap, Heart)

---

## 13. Sistema de Notificações

### Tabela: `notificacoes`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `usuario_id` | UUID | Destinatário |
| `tipo` | Enum | Tipo da notificação |
| `titulo` | Text | Título |
| `mensagem` | Text | Mensagem |
| `lida` | Boolean | Se foi lida |

### Tipos de Notificação

| Tipo | Evento |
|------|--------|
| `TAREFA_NOVA` | Nova tarefa criada para o aluno |
| `TAREFA_ENTREGUE` | Aluno entregou uma tarefa |
| `TAREFA_CORRIGIDA` | Admin corrigiu uma tarefa |
| `AULA_ATUALIZADA` | Status de aula alterado |
| `CONQUISTA_DESBLOQUEADA` | Nova conquista desbloqueada |
| `RELATORIO_DISPONIVEL` | Novo relatório mensal disponível |

### Espelhamento para Responsáveis

- Quando uma notificação é criada para um Aluno, o trigger `espelhar_notificacao_para_responsaveis()` cria cópias para todos os Responsáveis vinculados
- A mensagem espelhada tem prefixo: `[Nome do Aluno] {mensagem original}`

### Funcionalidades

- **Realtime**: Novas notificações aparecem instantaneamente via Supabase Realtime
- **Marcar como lida**: Individual ou todas de uma vez ("Marcar todas como lidas")
- **Sino de notificações**: Badge com contador de não lidas em todas as páginas
- **Toast**: Notificação visual popup ao receber nova notificação

### Notificações por E-mail

- Edge Function `enviar-email-notificacao` envia e-mails via Resend
- Flag `notif_email_ativo` controla se o usuário recebe e-mails

---

## 14. Relatórios Mensais

### Tabela: `relatorios_mensais`

| Campo | Descrição |
|-------|-----------|
| `aluno` | Referência ao aluno |
| `mes_referencia` | Formato `MM/YYYY` |
| `porcentagem_concluida` | % de tópicos concluídos |
| `porcentagem_em_desenvolvimento` | % de tópicos em desenvolvimento |
| `progresso_por_categoria` | JSONB com progresso por categoria |
| `comentario_automatico` | Comentário gerado automaticamente |
| `conteudo_gerado` | Texto completo do relatório |
| `arquivo_pdf` | URL do PDF gerado |

### Geração

- Função `gerar_relatorios_mensais()` processa todos os alunos ativos
- Referencia o mês anterior ao atual
- Calcula progresso apenas do nível CEFR atual

### Comentários Automáticos

| Progresso | Comentário |
|-----------|-----------|
| < 40% | "O aluno está em fase inicial de consolidação..." |
| 40-69% | "O aluno apresenta progresso consistente..." |
| ≥ 70% | "O aluno demonstra bom domínio dos conteúdos..." |

### Acesso

- Admin pode ver e gerar relatórios de todos os alunos
- Alunos podem ver seus próprios relatórios (se `show_relatorios = true`)
- Responsáveis podem ver relatórios dos alunos vinculados

---

## 15. Perfil e Foto

### Foto de Perfil

- Upload via dialog `EditarFotoPerfilDialog`
- Armazenada no bucket `avatars` (público)
- Campo `foto_perfil_url` na tabela `usuarios`
- Componente `FotoPerfil` renderiza avatar ou fallback com iniciais

### Perfil Editável

- Aluno pode editar: foto de perfil, e-mail
- Responsável pode editar: foto de perfil, e-mail, telefone, preferência de contato
- Admin pode editar todos os campos de qualquer usuário

---

## 16. Segurança e RLS

### Princípios

- **Row Level Security (RLS)** ativado em todas as tabelas
- Função `has_role()` (SECURITY DEFINER) evita recursão em policies
- Função `is_responsavel_of()` verifica vínculo responsável↔aluno
- Função `get_user_type()` retorna tipo do usuário
- Edge Functions usam `service_role` para operações que bypassam RLS

### Resumo de Acesso por Tabela

| Tabela | Admin | Aluno | Responsável |
|--------|-------|-------|-------------|
| `usuarios` | CRUD total | Lê/atualiza próprio | Lê alunos vinculados |
| `aulas` | CRUD total | Lê próprias | Lê dos alunos vinculados |
| `tarefas` | CRUD total | Lê/atualiza próprias | Lê dos alunos vinculados |
| `entregas_tarefas` | CRUD total | Cria/lê próprias | Lê dos alunos vinculados |
| `topicos_progresso` | CRUD total | Lê próprios | Lê dos alunos vinculados |
| `conquistas_alunos` | Insere/lê/deleta | Lê próprias | Lê dos alunos vinculados |
| `conquistas_mestre` | CRUD total | Lê | Lê |
| `notificacoes` | CRUD total | Lê/atualiza próprias | Lê/atualiza próprias |
| `relatorios_mensais` | Insere/lê/atualiza | Lê próprios | Lê dos alunos vinculados |
| `categorias` | CRUD total | Lê | Lê |
| `topicos_padrao` | CRUD total | Lê | Lê |
| `responsaveis_alunos` | Insere/lê/deleta | — | Lê próprios vínculos |
| `user_roles` | CRUD total | Lê próprios | Lê próprios |

---

## 17. Edge Functions

| Function | JWT | Descrição |
|----------|-----|-----------|
| `lookup-user` | Não | Busca e-mail/tipo por nome de usuário ou e-mail (login) |
| `check-username` | Não | Verifica disponibilidade de nome de usuário |
| `criar-usuario-admin` | Não* | Cria novo usuário (verifica admin internamente) |
| `enviar-email-notificacao` | Não | Envia e-mail de notificação via Resend |
| `gerar_relatorios_mensais` | Não | Gera relatórios mensais de todos os alunos ativos |

> *`criar-usuario-admin` não verifica JWT via config, mas **verifica internamente** se o chamador é Admin via token Authorization.

---

## 18. Banco de Dados — Tabelas

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `usuarios` | Perfis de todos os usuários |
| `user_roles` | Roles para RLS |
| `aulas` | Registro de aulas |
| `tarefas` | Tarefas (obrigatórias e sugeridas) |
| `entregas_tarefas` | Entregas de tarefas pelos alunos |
| `topicos_padrao` | Modelo curricular por nível |
| `topicos_progresso` | Progresso individual por tópico |
| `categorias` | Categorias curriculares |
| `conquistas_mestre` | Catálogo de conquistas |
| `conquistas_alunos` | Conquistas desbloqueadas |
| `conquistas` | Tabela legada de conquistas |
| `notificacoes` | Notificações |
| `relatorios_mensais` | Relatórios mensais |
| `responsaveis_alunos` | Vínculos responsável↔aluno |

### Views

| View | Descrição |
|------|-----------|
| `resumo_aulas_por_aluno` | Totais de aulas agregados por aluno |
| `dashboard_resumo_alunos` | Dashboard consolidado para admin |

### Enums

| Enum | Valores |
|------|---------|
| `tipo_usuario` | `Aluno`, `Responsável`, `Adulto`, `Admin` |
| `app_role` | `admin`, `aluno`, `responsavel`, `adulto` |
| `nivel_cefr` | `A1`, `A2`, `B1`, `B2`, `C1`, `C2` |
| `modalidade` | `Online`, `Presencial`, `Híbrido` |
| `status_aula` | `Agendada`, `Realizada`, `Cancelada`, `Remarcada` |
| `status_topico` | `A Introduzir`, `Em Desenvolvimento`, `Concluído` |
| `status_conquista` | `Desbloqueada`, `Oculta` |
| `tipo_conquista` | `Progresso`, `Presença`, `Atividades`, `Nível CEFR`, `Extra`, `Comportamento`, `Engajamento` |
| `tipo_conquista_mestre` | `GERAL`, `NIVEL` |
| `tipo_notificacao` | `TAREFA_NOVA`, `TAREFA_ENTREGUE`, `TAREFA_CORRIGIDA`, `AULA_ATUALIZADA`, `CONQUISTA_DESBLOQUEADA`, `RELATORIO_DISPONIVEL` |

---

## 19. Banco de Dados — Funções e Triggers

### Funções de Segurança

| Função | Tipo | Descrição |
|--------|------|-----------|
| `has_role(_user_id, _role)` | SECURITY DEFINER | Verifica se usuário tem determinada role |
| `get_user_type(_user_id)` | SECURITY DEFINER | Retorna tipo_usuario |
| `is_responsavel_of(_user_id, _aluno_id)` | SECURITY DEFINER | Verifica vínculo responsável→aluno |
| `aluno_tem_responsavel(p_aluno_id)` | SECURITY DEFINER | Verifica se aluno tem responsável vinculado |

### Funções de Progresso

| Função | Descrição |
|--------|-----------|
| `get_progresso_aluno(p_aluno)` | Calcula progresso em tempo real |
| `get_dashboard_aluno(p_aluno)` | Retorna todos os dados do dashboard |
| `recalcular_progresso_aluno()` | Trigger que recalcula ao alterar tópicos |
| `status_to_numeric(status)` | Converte status para valor numérico |

### Funções de Sincronização de Currículo

| Função | Evento | Descrição |
|--------|--------|-----------|
| `popular_topicos_iniciais()` | INSERT em `usuarios` | Popula tópicos ao criar aluno |
| `popular_topicos_por_nivel()` | UPDATE em `usuarios` | Popula tópicos ao mudar nível CEFR |
| `sync_topico_padrao_insert()` | INSERT em `topicos_padrao` | Propaga novo tópico para alunos |
| `sync_topico_padrao_update()` | UPDATE em `topicos_padrao` | Propaga edição para alunos |
| `sync_topico_padrao_delete()` | DELETE em `topicos_padrao` | Remove tópico de alunos |
| `sync_topicos_aluno(p_aluno)` | Manual (RPC) | Sincroniza tópicos de um aluno |

### Funções de Conquistas

| Função | Descrição |
|--------|-----------|
| `verificar_conquistas_automaticas(p_aluno_id)` | Verifica e desbloqueia conquistas GERAL |
| `verificar_conquistas_nivel(p_aluno_id)` | Verifica e desbloqueia conquistas de NIVEL |
| `trigger_conquista_primeira_aula()` | Trigger específico para primeira aula |
| `trigger_verificar_conquistas_aula()` | Trigger ao alterar aula |
| `trigger_verificar_conquistas_tarefa()` | Trigger ao alterar tarefa |
| `trigger_verificar_conquistas_progresso()` | Trigger ao alterar progresso |
| `trigger_verificar_conquistas_nivel()` | Trigger ao concluir tópico |

### Funções de Notificação

| Função | Descrição |
|--------|-----------|
| `espelhar_notificacao_para_responsaveis()` | Copia notificação do aluno para responsáveis |

### Funções de Relatório

| Função | Descrição |
|--------|-----------|
| `gerar_relatorios_mensais()` | Gera relatórios de todos os alunos ativos |

### Funções Utilitárias

| Função | Descrição |
|--------|-----------|
| `atualizar_timestamp_tarefas()` | Atualiza `atualizada_em` em tarefas |
| `atualizar_ultima_atualizacao()` | Atualiza timestamp em tópicos |
| `validar_vinculo_responsavel_aluno()` | Valida tipos ao criar vínculo |
| `configurar_flags_cards_aluno()` | Define flags de cards baseado em responsável |

---

## 20. Storage (Armazenamento)

### Buckets

| Bucket | Público | Uso |
|--------|---------|-----|
| `avatars` | ✅ Sim | Fotos de perfil dos usuários |
| `tarefas` | ❌ Não | PDFs de enunciados e entregas de tarefas |

---

## 21. Rotas da Aplicação

### Públicas

| Rota | Componente |
|------|-----------|
| `/` | Index (Landing) |
| `/login` | Login |

### Admin (protegidas por `AdminProtectedRoute`)

| Rota | Componente |
|------|-----------|
| `/admin` | AdminDashboard |
| `/admin/dashboard` | AdminDashboard |
| `/admin/aulas` | AdminAulas |
| `/admin/calendario-aulas` | AdminCalendarioAulas |
| `/admin/tarefas` | AdminTarefas |
| `/admin/conquistas` | AdminConquistas |
| `/admin/relatorios` | AdminRelatorios |
| `/admin/responsaveis` | AdminResponsaveis |
| `/admin/criar-usuario` | AdminCriarUsuario |
| `/admin/aluno/:aluno_id` | StudentDetails |
| `/admin/notificacoes` | AdminNotificacoes |

### Aluno (protegidas por `AlunoProtectedRoute`)

| Rota | Componente |
|------|-----------|
| `/aluno/dashboard` | AlunoDashboard |
| `/aluno/progresso` | AlunoProgresso |
| `/aluno/tarefas` | AlunoTarefas |
| `/aluno/tarefas/:tarefa_id` | AlunoTarefaDetalhes |
| `/aluno/conquistas` | AlunoConquistas |
| `/aluno/calendario` | AlunoCalendario |
| `/aluno/aulas` | AlunoAulas |
| `/aluno/notificacoes` | AlunoNotificacoes |

### Responsável (protegidas por `ResponsavelProtectedRoute`)

| Rota | Componente |
|------|-----------|
| `/responsavel/dashboard` | ResponsavelDashboard |
| `/responsavel/aluno/:aluno_id` | ResponsavelAlunoDetalhes |
| `/responsavel/notificacoes` | ResponsavelNotificacoes |
| `/responsavel/relatorios` | ResponsavelRelatorios |

### Catch-all

| Rota | Componente |
|------|-----------|
| `*` | NotFound (404) |

---

## Secrets Configurados

| Nome | Uso |
|------|-----|
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_ANON_KEY` | Chave pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (Edge Functions) |
| `SUPABASE_DB_URL` | URL do banco |
| `SUPABASE_PUBLISHABLE_KEY` | Chave publicável |
| `RESEND_API_KEY` | API do Resend para e-mails |
| `LOVABLE_API_KEY` | API do Lovable |

---

> 📌 **Este documento é a referência principal (bíblia) do sistema Portal do Aluno. Deve ser atualizado a cada nova funcionalidade ou alteração de regra de negócio.**

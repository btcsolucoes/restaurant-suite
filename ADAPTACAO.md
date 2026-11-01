# Stride: adaptação auditável

## Escopo e compatibilidade

Continuação de `btcsolucoes/restaurant-suite`, base `4a883d2`. Preserva React/Vite, identidade visual, calendário, diário de treinos, musculação, nutrição, check-ins, exportação e atualização PWA. O plano e os registros continuam em IndexedDB no aparelho, com transação atômica e controle de revisão entre abas. Não há sincronização entre aparelhos.

O nome do banco, versão 1, chave `athlete` e esquema 1 permanecem iguais. As informações de auditoria são campos opcionais nas decisões; backups antigos continuam aceitos. A fonte importada não é reescrita ao aprovar ajustes: os fatores ficam separados. Reimportação e restauração existentes continuam disponíveis para transferência ou troca deliberada do plano, mas não são necessárias para adaptação diária.

## Motor 2.0.0

`lib/adaptive.ts` recebe estado e data explícita. Não chama serviços de IA, rede ou sorteio. Mesmas entradas produzem as mesmas propostas. Cada decisão armazena versão, regra, fator anterior, fator proposto e fotografia dos dados considerados, incluindo plano, registros, check-ins e ajustes. O identificador inclui uma impressão dos dados: se mudarem, a aprovação antiga é recusada e a proposta deve ser revista.

Prioridade das regras:

1. Dor ≥4/10 nos últimos três dias ou alerta/dor em check-in dos últimos dois dias: propor pausa das sessões ainda não realizadas dos próximos sete dias. Uma pausa pode substituir um ajuste previamente aprovado.
2. Sono <6 h, recuperação ≤2/5 ou RPE ≥8 recente: propor fator 0,8 nas sessões até dois dias adiante. Uma redução existente não é multiplicada repetidamente.
3. Duas sessões RPE ≥7 nos últimos três dias: propor redução nas próximas sessões até o dia seguinte. Considera modalidades combinadas.
4. Progressão: pelo menos quatro registros da modalidade nos 14 dias anteriores; todos os treinos recentes sem dor, RPE conhecido ≤6; pelo menos dez check-ins, sono ≥6 h e recuperação ≥3; aderência ≥80%. Máximo de um aumento aprovado por semana, compartilhado pelas modalidades. Aumento máximo de 5% na sessão; total semanal e da modalidade limitados a 105% da menor das duas semanas realizadas. O orçamento considera o plano completo daquela semana. Sem espaço no orçamento, não há aumento.

Não aumenta automaticamente intensidade, pace, pesos de musculação, simulados/eventos, semanas S4/S8/S10 ou sessões a partir de 13/12/2026. Bike só recebe progressão se o reparo do STI estiver marcado. Na musculação adapta-se a duração da sessão, sem prescrever aumento de peso ou mudar automaticamente séries/repetições. As séries originais continuam identificadas como referência. Para avaliar esforço da musculação, registrar também a sessão com duração/RPE/dor no diário de treinos; os registros de exercícios continuam guardando séries, repetições e cargas.

Os limites são políticas conservadoras do produto, não limiares clínicos validados nem garantia de prevenção de lesão. Não há ajuste automático de um plano importado apenas porque já está acima do limite: o limite bloqueia aumentos propostos pelo motor. Falta de dados não significa prontidão. Sinais recentes têm janelas definidas; não se deve interpretar o desaparecimento de uma proposta como resolução de um sintoma.

Aprovar grava um único fator vigente para a sessão; recusar mantém a carga; restaurar original remove o fator e acrescenta uma decisão ao histórico. A restauração retorna ao plano importado, não ao fator intermediário anterior. Decisões anteriores permanecem preservadas. Sessões já realizadas não recebem novas propostas.

## Meta e projeções

Meta fixa em 31/12/2026: 90 km a 30–35 km/h, seguidos de 21,1 km a 5:20/km. Tempos-alvo: aproximadamente 2h34min17s–3h de bike e 1h52min32s de corrida, sem transição.

Usa o maior treino válido de cada modalidade nos últimos 28 dias. Resultados antigos aparecem separados como histórico; estimativas da conversa não foram inseridas como resultados. Exibe:

- extrapolação de tempo caso o pace/velocidade observado pudesse ser mantido na distância-alvo;
- cenário matemático de distância com 5% semanal até a meta, sem prometer evolução;
- falta de evidência, sintomas, ausência de sessão combinada e prazo encerrado;
- confiança baixa explicitamente, sem converter o cenário em liberação para a prova.

O cenário de distância é distinto do motor de duração: não inclui descargas, fisiologia, terreno ou penalidade de transição. Não acelera o plano para tentar cumprir a meta.

## Importação inicial

XLSX mantém todas as abas. CSV representa apenas `Calendario`, com os mesmos cabeçalhos e ordem do formato original:

`Data;Dia;Semana;Sessão;Treino prescrito;Musculação;Intensidade;Min estimados`

Datas ISO ou DD/MM/AAAA; minutos numéricos. Abas opcionais ausentes geram avisos. Prévia e confirmação permanecem obrigatórias. Backup completo continua XLSX; CSV não restaura históricos completos. O leitor SheetJS foi atualizado para 0.20.3 pela distribuição oficial e o Vite para 8.3.5.

## Validação e publicação

- `npm test`: persistência, reabertura, concorrência, backup XLSX, CSV, cálculos, regras, evidências, aprovação/recusa, expiração, reversão e limites.
- `npm run build`: TypeScript e build de produção.
- `node scripts/test-sw.mjs`: atualização PWA, precache offline e isolamento do banco.
- `npm audit`: zero vulnerabilidades reportadas na instalação validada.
- Conferência em navegador desktop e 390 px: propostas, aprovação e ausência de rolagem horizontal, com dados sintéticos apenas em localhost.

**Não publicar sem confirmação:** push/merge em `main` dispara o workflow que substitui `gh-pages`. Esta alteração deve ficar na branch de revisão até aprovação. Antes de publicar, usar um backup real do usuário em ambiente de teste para conferir a planilha específica; o repositório não contém os dados pessoais do aparelho. Não trocar domínio ou caminho de instalação: o banco é associado à origem e ao caminho.

## Referências de projeto

- IOC, monitoramento de carga e recuperação: https://bjsm.bmj.com/content/50/17/1030
- AIS, progressão individualizada após redução de carga: https://www.ausport.gov.au/ais/position_statements/training-load-in-relation-to-loading-and-unloading-phases-of-training
- CDC, percepção de intensidade e teste da fala: https://www.cdc.gov/physical-activity-basics/measuring/
- Distribuição oficial SheetJS: https://docs.sheetjs.com/docs/getting-started/installation/nodejs/

Essas referências orientam os princípios de monitoramento; não validam os números específicos das regras do aplicativo.

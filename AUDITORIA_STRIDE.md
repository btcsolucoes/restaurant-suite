# Auditoria do Stride — 5 de novembro de 2026

Escopo: pedidos nesta conversa, código do repositório e regressões reproduzidas com dados sintéticos. O banco IndexedDB do telefone e o backup real não foram acessados. Este documento não certifica o aplicativo inteiro nem a prescrição esportiva.

## Erros de entrega e comunicação

- Afirmei repetidamente que estava corrigido/liberado após um deploy, sem verificar o calendário persistido no aparelho. Publicar código não modifica automaticamente decisões já salvas.
- Confundi a musculação do gerador novo com a sessão importada exibida na captura. A captura tinha quatro exercícios de uma série; minha primeira resposta descreveu outros exercícios.
- Justifiquei uma sessão curta de pernas pelo longão seguinte sem conferir a distância de 5 km informada pelo usuário.
- Fiz alterações sucessivas sem reproduzir primeiro a interação entre calendário importado, revisões semanais e ajustes pontuais.
- Tratei build e testes de domínio como evidência excessiva de usabilidade. Não houve validação visual no telefone; o Chromium local não estava disponível.
- O aplicativo foi descrito de forma mais abrangente que sua implementação: é um motor de regras, não uma avaliação fisiológica completa nem garantia de preparação para 90 km + 21,1 km.

## Falhas técnicas e tratamento

| Falha | Correção / situação |
|---|---|
| Semana filtrada por S1/P1 ocultava datas após revisão parcial | Já corrigida: sete datas de segunda a domingo |
| Campo de ritmo exigia segundos/km | Já corrigido: entrada mm:ss e unidade min/km |
| Registro em um dia bloqueava a semana inteira | Já corrigido: preservação de dias registrados |
| Só era possível revisar a semana seguinte | Já corrigido: revisão a partir de hoje |
| Pausa persistida como fator zero não aparecia na comparação de “plano aplicado” | Corrigido nesta auditoria: considerar ajustes sobre os dias revisados |
| Atualização do gerador não reparava pausa gravada dentro da fonte | Nova prévia de restauração por data usando snapshots/arquivos anteriores, sem inventar treino |
| Pausa pontual antiga continuava zerando treino positivo | Diagnóstico distinto e restauração explícita do original, com histórico e desfazer |
| Motor pontual ainda propunha fator zero para todos os dias seguintes | Restringido ao dia avaliado; não cria nova sequência de pausas futuras |
| Registros incompletos eram tratados como semana de volume zero | Usa base declarada com explicação quando as duas semanas não têm volume registrado; não declara progressão habilitada por isso |
| Corrida marcada como não realizada consumia orçamento como se tivesse ocorrido | Usa realizado (zero quando não realizada), sem compensação automática |
| Duração completa de um combinado podia ser contada como corrida | Usa duração específica de corrida; não transforma pedal em minutos de corrida |
| Dia de reavaliação consumia orçamento antes de zerar a sessão | Débito agora ocorre depois da definição da dose do dia |

## Restauração

A tela Hoje/Minha semana identifica pausas dos próximos oito dias e mostra a origem. A restauração só é oferecida quando existe treino anterior recuperável e não há registros no dia. Mantém identificadores, diário e cargas executadas. Prévia desatualizada é recusada. Sem fonte anterior, o app informa a limitação; não inventa 5 km ou outra sessão. Recuperar um planejamento não equivale a liberação clínica.

## Pedidos ainda não integralmente atendidos

- Não foi concluída análise audiovisual integral dos dois vídeos (quadros observados anteriormente não equivalem a assistir com áudio).
- Não há projeção fisiológica individual validada para 5/10/21,1 km, 90 km de bike ou a combinação.
- A progressão usa heurísticas e exige dados de recuperação. Não constitui periodização individualizada completa até a meta, nem garante longões de 18–21 km no prazo.
- Os paces do novo gerador são principalmente por esforço; a meta 5:20/km não é um limiar medido.
- A força não tem progressão individual completa de carga/repetições; a rotina inicial não deve ser apresentada como prescrição definitiva de hipertrofia.
- A geometria/resistência da bicicleta e a aptidão médica não foram verificadas pelo aplicativo.
- A correção efetiva do estado do telefone só pode ser confirmada no aparelho ou com seu backup. Não é correto dizer “todos os erros resolvidos”.

## Verificação

Testes de persistência, importação/exportação, cálculo de orçamento, revisão parcial, preservação de dias registrados, aprovação e desfazer. Regressões novas cobrem pausas sobrepostas, snapshots com zero minutos, ausência de fonte original, alteração de dados após prévia e ausência de novas pausas futuras. Renderização React no servidor verifica presença de ações habilitadas; não substitui teste visual/interativo em Android.

## Cobrança

Nenhum reembolso ou crédito foi solicitado em nome do usuário. O agente não dispõe de acesso à cobrança nem pode restituir tokens. O registro das falhas não representa promessa de restituição.

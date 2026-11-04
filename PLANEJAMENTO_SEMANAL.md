# Planejamento semanal no STRIDE

Em **Adaptações → Minha semana**, salvar metas e base recente. Os valores sugeridos são estimativas editáveis, não resultados do usuário. É possível começar sem importar planilha e continuar usando os registros existentes.

O botão **Montar / revisar próxima semana** prepara a próxima segunda até domingo (limitado à data da meta). Mostra prescrição completa, antes/depois, minutos por modalidade, justificativa e aprovação/recusa. Somente a aprovação atualiza o calendário. Treinos já registrados nessa semana impedem substituição. A semana aprovada pode ser desfeita enquanto não houver novos registros ou outras alterações no plano/ajustes. Registros, check-ins e refeições permanecem intactos. Fontes anteriores e evidências ficam na decisão semanal, com no máximo 24 decisões.

## Rotina e doses

- Força de segunda a sábado: foco em peito, costas e ombros; terça/quinta com dose curta; pernas quarta; sábado leve. As séries específicas por data prevalecem sobre as antigas rotinas por dia da semana.
- Corrida terça (intervalado, fartlek ou tempo fracionado), longão quinta e corrida após bike domingo. Sexta/sábado sem cardio.
- Bike quarta e domingo por duração/esforço. STI pendente direciona a proposta para indoor com resistência funcional. Marcar reparo não presume ausência de outros defeitos mecânicos.
- Trechos rápidos só entram com registros, check-ins recentes sem dor e tempo suficiente para aquecimento, blocos, pausas e desaquecimento. Caso contrário a terça consolida corrida fácil. Não são prescritos testes máximos nem limiar fisiológico presumido.

O orçamento de corrida usa a menor das duas semanas realizadas nos últimos 14 dias quando há pelo menos três corridas, ou a base declarada no início. Progressão exige pelo menos seis corridas nos últimos 14 dias, quatro check-ins na última semana, o mais recente em até um dia, esforço registrado e recuperação consistente. O longão usa a maior duração dos últimos 28 dias, limitado à metade do orçamento semanal e a 120 minutos. Os aumentos operacionais são de até 10% de duração, não uma regra clínica de segurança. As primeiras semanas podem apenas consolidar a base. Sem registros suficientes, não há promessa de chegar à distância-alvo.

Ao crescer o longão, mantém bike e dose rápida. O combinado usa 20% dos minutos de corrida, no máximo 45 min; bike pode crescer apenas quando não há crescimento do longão e existe evidência da modalidade. Há descarga a cada quarto ciclo e redução nos 13 dias anteriores à meta. Dor ≥4/10 ou alerta propõe pausa; sintomas >2, sono <6 h ou recuperação ≤2 propõem redução e retiram qualidade. As propostas imediatas de recuperação continuam disponíveis para sessões já cadastradas; a progressão antiga por fatores fica desligada quando o perfil semanal está ativo.

Os limites são escolhas explícitas de produto para revisão com o atleta, não protocolos validados, garantias de segurança ou licença médica. O sistema não aumenta a carga para fazer caber uma meta no prazo. A meta de completar a distância fica distinta da velocidade desejada e pode ser editada. O planejamento semanal é de treinamento, sem inserir automaticamente o desafio completo na data-alvo.

## Diário e evolução

No registro de treino, informar ambiente (externo/indoor) e tipo executado (fácil, intervalado, fartlek, tempo, longo ou combinado), além de duração, distância, RPE e dor. Campos antigos ausentes são desconhecidos; não recebem valores inventados. Musculação mantém séries/repetições/cargas e exige também registro de duração/RPE para compor carga global. Check-ins registram sono, recuperação e sintomas.

O painel compara volume de 14 dias e carga descritiva minutos × RPE, excluindo RPE ausente. Tendência de pace usa apenas corridas fáceis externas sem dor, RPE 3–5, 20–60 minutos, com pelo menos três observações em cada quinzena e duração semelhante (±20%). Comparação por pares permite reutilizar uma referência anterior; é descritiva e não teste estatístico. Clima, terreno e transição não são corrigidos. Não estima VO₂máx, FTP ou limiar, nem extrapola spinning para velocidade de estrada.

## Dados e validação

Mantém nome, versão do IndexedDB e esquema de backup. Perfil e decisões semanais são campos opcionais, preservados no JSON do backup completo XLSX. Testes cobrem início sem planilha, sessões combinadas, aprovação expirada por novos dados, recusa, desfazer, bloqueio com registros, rotina semanal, progressão, pausa, prazo da meta, tendências e restauração de backup. `npm test`, `npm run build` e `node scripts/test-sw.mjs` verificam persistência, TypeScript, build e atualização offline.

Publicação permanece sujeita à confirmação descrita em ADAPTACAO.md. A alteração é preparada em branch de revisão; o domínio/caminho e o banco do aplicativo instalado não mudam.

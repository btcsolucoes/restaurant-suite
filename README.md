# STRIDE · GitHub Pages + PWA

Aplicativo de duathlon, musculação, nutrição e recuperação. Funciona com arquivos XLSX do plano original e backups completos do STRIDE. Este repositório não contém a planilha pessoal, dados clínicos ou registros do atleta.

## Instalar no telefone

Abra a URL publicada em um navegador externo ao ChatGPT.

- Android/Chrome: botão **Instalar no celular**, ou menu **⋮ → Adicionar à tela inicial → Instalar**.
- iPhone/Safari: **Compartilhar → Adicionar à Tela de Início**.
- Na primeira abertura, importe a planilha XLSX ou um backup completo da versão anterior. Em **Meus dados**, exporte backups regularmente.

## Atualizações

Cada push para `main` executa testes, compila e publica pelo GitHub Actions. O app verifica novas versões ao abrir, voltar ao primeiro plano e a cada hora, além do botão **Buscar atualização**. Uma nova versão pré-carregada mostra **Atualizar aplicativo**. O botão é bloqueado durante formulários e gravações. Fechar todas as abas também permite a ativação normal da nova versão.

O cache do código e o IndexedDB dos registros são separados. Atualizar o código não apaga nem substitui o banco. As gravações usam revisão otimista dentro de uma transação atômica para impedir sobrescritas entre abas. O nome do banco depende do caminho de instalação, e não da versão do aplicativo. Mudanças futuras de esquema devem usar migrações em `onupgradeneeded`, preservando os registros existentes.

## Armazenamento e transferência

O GitHub Pages hospeda somente arquivos estáticos. Os dados ficam no IndexedDB do navegador/aparelho, sem envio ao GitHub e sem sincronização automática com outro dispositivo ou com a versão anterior hospedada em nuvem. O app solicita armazenamento persistente quando suportado; a concessão depende do navegador. Apagar os dados do site, usar navegação anônima ou trocar de aparelho exige restaurar um backup. Atualizar o aplicativo é diferente de limpar os dados do site.

Para transferir registros da versão anterior: abrir a versão anterior → **Meus dados → Baixar backup completo · XLSX** → abrir a versão Pages → **Importar planilha** → revisar e confirmar restauração. A planilha original também pode ser importada sem registros prévios.

## Publicar

### Pelo seu computador Windows

Extraia o pacote inteiro e abra `PUBLICAR_NO_GITHUB.cmd`. O arquivo instala as ferramentas oficiais GitHub CLI e Git pelo Windows quando necessário, sem aceitar acordos automaticamente. Ele abre a autenticação no navegador do próprio computador, cria um repositório público novo, ativa o Pages, envia o código e acompanha a publicação. Se o nome `stride-duathlon` já existir, usa um nome novo para não alterar outro projeto. O endereço final é salvo em `URL_DO_APLICATIVO.txt` depois de uma publicação bem-sucedida.

A autenticação permanece no GitHub CLI desse computador. Nenhuma senha ou token é repassado ao ChatGPT. O app não requer Node instalado no seu PC para publicar: o build e os testes são executados pelo GitHub Actions. As próximas mudanças podem ser enviadas ao mesmo repositório; cada push para `main` publica uma atualização.

### Configuração manual

1. Crie um repositório chamado `stride-duathlon` na sua conta GitHub. Para GitHub Free, use repositório público. Somente o código deste projeto deve ser publicado.
2. Envie o conteúdo deste diretório para a branch `main`.
3. Em **Settings → Pages → Build and deployment → Source**, escolha **GitHub Actions**.
4. Acompanhe **Actions → Publicar STRIDE** e use a URL retornada pelo deployment.

O build usa caminhos relativos para funcionar em um projeto Pages (`/stride-duathlon/`) ou domínio próprio, sem alterar os caminhos dos recursos. O manifesto, o service worker e os ícones ficam no mesmo escopo do app.

## Desenvolvimento

Requer Node 22.12+ ou Node 24.

```
npm ci
npm test
npm run build
npm run dev
```

`scripts/build-sw.mjs` gera o precache a partir dos arquivos compilados, incluindo o leitor XLSX para uso offline. Mantém o cache anterior durante uma transição entre abas; só remove caches deste mesmo caminho de instalação. Nunca exclui ou recria o IndexedDB.

`scripts/test.mjs` verifica importação, persistência após nova abertura/versão, concorrência, registros, cálculos, adaptações e restauração exata de backup. A validação da planilha e todas as regras continuam funcionando sem servidor. Nenhuma alteração de carga é aplicada sem aprovação.

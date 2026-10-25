@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo STRIDE - Publicar no GitHub Pages
echo O login sera aberto no navegador DESTE computador.
echo Nenhuma senha ou token sera enviado ao ChatGPT.
echo.

where gh >nul 2>nul
if errorlevel 1 (
  echo Instalando a ferramenta oficial GitHub CLI pelo Windows...
  where winget >nul 2>nul
  if errorlevel 1 goto sem_gh
  winget install --exact --id GitHub.cli --source winget
  if errorlevel 1 goto falha
)
set "PATH=%ProgramFiles%\GitHub CLI;%ProgramFiles%\Git\cmd;%PATH%"
where gh >nul 2>nul
if errorlevel 1 goto sem_gh
where git >nul 2>nul
if errorlevel 1 (
  echo Instalando o Git pelo Windows...
  where winget >nul 2>nul
  if errorlevel 1 goto sem_git
  winget install --exact --id Git.Git --source winget
  if errorlevel 1 goto falha
)
where git >nul 2>nul
if errorlevel 1 goto sem_git

gh auth status --hostname github.com >nul 2>nul
if errorlevel 1 (
  gh auth login --hostname github.com --git-protocol https --web --scopes repo,workflow
) else (
  gh auth refresh --hostname github.com --scopes repo,workflow
)
if errorlevel 1 goto falha

set "STRIDE_OWNER="
for /f "delims=" %%U in ('gh api user --jq .login') do set "STRIDE_OWNER=%%U"
if not defined STRIDE_OWNER goto falha
set "STRIDE_REPO=stride-duathlon"
gh repo view "%STRIDE_OWNER%/%STRIDE_REPO%" >nul 2>nul
if not errorlevel 1 set "STRIDE_REPO=stride-duathlon-%RANDOM%%RANDOM%"
echo.
echo Criando %STRIDE_OWNER%/%STRIDE_REPO%...
echo O repositorio sera publico. Planilhas e registros pessoais nao fazem parte deste pacote.
gh repo create "%STRIDE_OWNER%/%STRIDE_REPO%" --public --add-readme --description "STRIDE - Duathlon, musculacao e nutricao. PWA offline com atualizacoes."
if errorlevel 1 goto falha
gh api --method POST "repos/%STRIDE_OWNER%/%STRIDE_REPO%/pages" -f build_type=workflow >nul
if errorlevel 1 goto falha
gh auth setup-git --hostname github.com
if errorlevel 1 goto falha

set "STRIDE_PUBLISH_DIR=%TEMP%\stride-publish-%RANDOM%%RANDOM%"
gh repo clone "%STRIDE_OWNER%/%STRIDE_REPO%" "%STRIDE_PUBLISH_DIR%" -- --quiet
if errorlevel 1 goto falha
robocopy "%~dp0." "%STRIDE_PUBLISH_DIR%" /E /XD .git node_modules .qa dist upload /XF *.xlsx *.csv *.db *.sqlite* .env* URL_DO_APLICATIVO.txt /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto falha
cd /d "%STRIDE_PUBLISH_DIR%"
git checkout -B main
if errorlevel 1 goto falha
git add --all
if errorlevel 1 goto falha
git -c user.name="%STRIDE_OWNER%" -c user.email="%STRIDE_OWNER%@users.noreply.github.com" commit -m "Publish STRIDE offline PWA with safe updates"
if errorlevel 1 goto falha
git push -u origin main
if errorlevel 1 goto falha
gh api --method PATCH "repos/%STRIDE_OWNER%/%STRIDE_REPO%" -f default_branch=main >nul
if errorlevel 1 goto falha

echo.
echo Aguardando o GitHub registrar a publicacao...
set "STRIDE_RUN_ID="
set "STRIDE_TRIES=0"
:aguardar_workflow
for /f "delims=" %%R in ('gh run list --repo "%STRIDE_OWNER%/%STRIDE_REPO%" --workflow pages.yml --branch main --limit 1 --json databaseId --jq ".[0].databaseId" 2^>nul') do set "STRIDE_RUN_ID=%%R"
if "%STRIDE_RUN_ID%"=="null" set "STRIDE_RUN_ID="
if defined STRIDE_RUN_ID goto acompanhar
set /a STRIDE_TRIES+=1 >nul
if %STRIDE_TRIES% GEQ 15 goto pendente
timeout /t 2 /nobreak >nul
goto aguardar_workflow

:acompanhar
gh run watch "%STRIDE_RUN_ID%" --repo "%STRIDE_OWNER%/%STRIDE_REPO%" --exit-status
if errorlevel 1 goto falha
set "STRIDE_URL="
for /f "delims=" %%P in ('gh api "repos/%STRIDE_OWNER%/%STRIDE_REPO%/pages" --jq .html_url') do set "STRIDE_URL=%%P"
if not defined STRIDE_URL goto pendente
>"%~dp0URL_DO_APLICATIVO.txt" echo %STRIDE_URL%
echo.
echo PUBLICADO: %STRIDE_URL%
echo O endereco tambem foi salvo em URL_DO_APLICATIVO.txt.
echo No telefone, abra esse endereco e toque em Instalar no celular.
start "" "%STRIDE_URL%"
goto fim

:pendente
echo.
echo O codigo foi enviado. Acompanhe a publicacao na pagina Actions do repositorio.
gh browse --repo "%STRIDE_OWNER%/%STRIDE_REPO%" --actions
goto fim

:sem_gh
echo Instale o GitHub CLI em https://cli.github.com e abra este arquivo novamente.
goto fim
:sem_git
echo Instale o Git em https://git-scm.com/download/win e abra este arquivo novamente.
goto fim
:falha
echo.
echo A etapa acima nao foi concluida. A publicacao nao sera marcada como pronta.
echo Seus dados de treino nao foram alterados. Leia a mensagem exibida acima.
:fim
echo.
pause
endlocal

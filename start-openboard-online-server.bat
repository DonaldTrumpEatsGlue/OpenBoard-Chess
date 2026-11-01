@echo off
setlocal
set "ComSpec=%SystemRoot%\System32\cmd.exe"
cd /d "%~dp0"
set "NODE_EXE="
for /f "delims=" %%I in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%I"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE_EXE (
  echo Node.js was not found. Install Node.js LTS, then run this launcher again.
  pause
  exit /b 1
)
for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
set "NPM_CLI=%NODE_DIR%node_modules\npm\bin\npm-cli.js"
if not exist "%NPM_CLI%" (
  echo npm was not found beside Node.js at "%NODE_DIR%".
  echo Reinstall Node.js LTS with its npm feature enabled.
  pause
  exit /b 1
)
"%NODE_EXE%" "%NPM_CLI%" --script-shell="%ComSpec%" run online-server
if errorlevel 1 (
  echo The online room server stopped with an error.
  pause
  exit /b 1
)

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
  echo Reinstall Node.js LTS with its npm feature enabled, then run this launcher again.
  pause
  exit /b 1
)
"%NODE_EXE%" "%NPM_CLI%" --script-shell="%ComSpec%" install
if errorlevel 1 (
  echo Could not install Openboard's development server.
  pause
  exit /b 1
)
start "Openboard Chess Server" "%~dp0run-openboard-server.bat"
for /l %%I in (1,1,30) do (
  curl.exe --silent --fail http://127.0.0.1:5173/ >nul 2>nul
  if not errorlevel 1 goto server_ready
  timeout /t 1 /nobreak >nul
)
echo Openboard did not start at http://127.0.0.1:5173/.
echo Check the Openboard Chess Server window for the error.
pause
exit /b 1
:server_ready
curl.exe --silent --fail http://127.0.0.1:3001/health >nul 2>nul
if errorlevel 1 (
  start "Openboard Online Rooms" "%~dp0start-openboard-online-server.bat"
  for /l %%I in (1,1,15) do (
    curl.exe --silent --fail http://127.0.0.1:3001/health >nul 2>nul
    if not errorlevel 1 goto online_ready
    timeout /t 1 /nobreak >nul
  )
  echo Online room server did not start. Offline chess is still available.
  echo Check the Openboard Online Rooms window before using the Online tab.
  goto open_app
)
:online_ready
echo Openboard Online Rooms is available at ws://127.0.0.1:3001/ws.
:open_app
start "" http://127.0.0.1:5173/

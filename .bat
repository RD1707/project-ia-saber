@echo off
setlocal

:: Define o caminho completo para a pasta nodejs
set "NODEJS_DIR=%~dp0nodejs"

:: Adiciona a pasta nodejs ao PATH temporariamente
set "PATH=%NODEJS_DIR%;%PATH%"

:: Abre o terminal com o Node.js disponível
cmd.exe

endlocal

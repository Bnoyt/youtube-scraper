@echo off
:: Copyright (c) 2015-2017 "Linkurious SAS"
::
:: This file is part of Linkurious.

:: Clean screen if the current directory is a network path to avoid warning:
:: "CMD.EXE was started with the above path as the current directory"
:: "UNC paths are not supported. Defaulting to Windows directory"
set _cwd=%~dp0%
set _cwd=%_cwd:~0,2%
if %_cwd% == \\ (cls)

SETLOCAL

SET NODE_PATH=%~dp0%system\node_modules\

SET /P _YN="This will STOP and UPDATE Linkurious, are you sure? [y|n]:"

IF /I %_YN% == y (
    PUSHD %~dp0%
    CALL "menu.bat" "stop"
    POPD
    PUSHD %~dp0%system\updater\
    START /b /wait "Linkurious Updater" "node.exe" "updater.js"
    POPD
) ELSE (
    ECHO Cancelled.
    PAUSE
)

ENDLOCAL

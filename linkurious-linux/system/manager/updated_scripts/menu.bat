@echo off
:: Copyright (c) 2015-2017 "Linkurious SAS"
::
:: This file is part of Linkurious.

:: resize the terminal
:: MODE CON: COLS=100 LINES=30

:: Clean screen if the current directory is a network path to avoid warning:
:: "CMD.EXE was started with the above path as the current directory"
:: "UNC paths are not supported. Defaulting to Windows directory"
set _cwd=%~dp0%
set _cwd=%_cwd:~0,2%
if %_cwd% == \\ (cls)

:: Going to Linkurious "system" dir and launching the manager
PUSHD %~dp0%system\
START /b /wait "Linkurious Manager" "node.exe" "manager\manager.js" %*
POPD

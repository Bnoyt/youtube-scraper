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

:: Fix current dir, then Start Linkurious
PUSHD %~dp0%
CALL "menu.bat" "start"
PAUSE

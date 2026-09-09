@echo off
set "PATH=C:\git\.tools\ffmpeg\ffmpeg-master-latest-win64-gpl\bin;%PATH%"
cd /d C:\git\artifacts\buyniverse-lifecycle
echo RUNNING > .hf-check.exit
C:\Users\jecha\.bun\bin\bunx.exe --bun hyperframes@0.8.12 check --snapshots --samples 12 --at-transitions > .hf-check.out.log 2> .hf-check.err.log
echo %ERRORLEVEL% > .hf-check.exit

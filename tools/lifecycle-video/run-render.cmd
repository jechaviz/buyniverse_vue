@echo off
set "PATH=C:\git\.tools\ffmpeg\ffmpeg-master-latest-win64-gpl\bin;%PATH%"
cd /d C:\git\artifacts\buyniverse-lifecycle
echo RUNNING > .hf-render.exit
C:\Users\jecha\.bun\bin\bunx.exe --bun hyperframes@0.8.12 render --quality high --fps 30 --workers 2 --output renders\buyniverse-full-lifecycle.mp4 > .hf-render.out.log 2> .hf-render.err.log
echo %ERRORLEVEL% > .hf-render.exit

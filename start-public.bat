@echo off
chcp 65001 >nul
cd /d C:\Users\Leo\cademo

echo [1/3] Arret des vieux processus...
taskkill /F /IM cloudflared.exe 2>nul
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/3] Lancement du serveur API...
start "CADEMO SERVER" /MIN node server-complete.js

echo Attente du serveur (5s)...
timeout /t 5 /nobreak >nul

echo [3/3] Lancement du tunnel Cloudflare...
start "CLOUDFLARE TUNNEL" /MIN cloudflared.exe tunnel --url http://localhost:8080

echo.
echo ===========================================
echo  Le serveur tourne sur http://localhost:8080
echo  Le lien public apparaitra dans la
echo  fenetre "CLOUDFLARE TUNNEL" dans ~10s.
echo ===========================================
echo.
echo NE PAS FERMER cette fenetre !
echo Pour arreter : fermer les 2 fenetres secondaires.
pause
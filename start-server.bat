@echo off
cd /d "C:\Users\Leo\cademo"
echo ===========================================
echo   CADEMO - DEMARRAGE DU SERVEUR
echo ===========================================
echo.
echo Le serveur va demarrer sur http://localhost:8080
echo Ne fermez pas cette fenetre !
echo.
echo Pour arreter : CTRL+C puis Y
echo.
node server-complete.js
pause
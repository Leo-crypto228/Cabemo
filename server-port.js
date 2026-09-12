const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // Serve the profile page
    const filePath = 'C:/Users/Leo/cademo/stitch/stitch_cademo_betting_platform/profil_cademo_mobile/code.html';
    
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            res.writeHead(404, {'Content-Type': 'text/html'});
            res.end('<h1>404 - File Not Found</h1>');
            return;
        }
        
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(data);
    });
});

// Use port 8080 (4 digits)
const PORT = 8080;
server.listen(PORT, 'localhost', () => {
    console.log('===========================================');
    console.log('CADEMO SITE ACCESS');
    console.log('===========================================');
    console.log('Serveur démarré sur : http://localhost:' + PORT);
    console.log('===========================================');
    console.log('Pour accéder à votre site :');
    console.log('http://localhost:' + PORT);
    console.log('===========================================');
});
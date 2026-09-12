const { createClient } = require('@supabase/supabase-js');
const http = require('http');

const supabase = createClient(
  'https://vmmicbfoobdbtikcqxel.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbWljYmZvb2JkYnRpa2NxeGVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzc2ODY1NSwiZXhwIjoyMTAzMzQ0NjU1fQ.Ws3GGccCAzgZ9FcxpIOWN6O2yAVu70DsYJ-tLHpJFwY',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkSupabase() {
  console.log('========================================');
  console.log('  LISTING TOUS LES USERS SUPABASE');
  console.log('========================================\n');

  const { data, error } = await supabase
    .from('users')
    .select('id, email, google_email, status')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Erreur Supabase:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('Aucun user dans la table.');
    return;
  }

  console.log('Nombre total de users:', data.length);
  console.log('');

  data.forEach((u, i) => {
    console.log(`[${i + 1}] ID: ${u.id}`);
    console.log(`    Email: ${u.email || 'null'}`);
    console.log(`    Google Email: ${u.google_email || 'null'}`);
    console.log(`    Status: ${u.status}`);
    console.log('');
  });

  // Cherche clientwebg2
  const found = data.find(u => 
    (u.email && u.email.toLowerCase().includes('clientwebg2')) ||
    (u.google_email && u.google_email.toLowerCase().includes('clientwebg2'))
  );

  if (found) {
    console.log('========================================');
    console.log('  COMPTE clientwebg2 TROUVE !');
    console.log('========================================');
    console.log('ID:', found.id);
    console.log('Status:', found.status);
  } else {
    console.log('Compte clientwebg2@gmail.com NON trouve dans les 20 derniers users.');
  }
}

function checkOllama() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:11434/api/tags', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('\n========================================');
          console.log('  OLLAMA EST EN LIGNE');
          console.log('========================================');
          console.log('Modeles disponibles:');
          json.models.forEach(m => console.log('  -', m.name));
          resolve(true);
        } catch {
          console.log('\nOllama repond mais pas au format attendu');
          resolve(false);
        }
      });
    });
    req.on('error', () => {
      console.log('\n========================================');
      console.log('  OLLAMA NON DETECTE');
      console.log('========================================');
      console.log('Verifie que Ollama tourne avec:');
      console.log('  ollama run llama3.2');
      console.log('Ou:');
      console.log('  ollama serve');
      resolve(false);
    });
    req.setTimeout(3000, () => {
      req.destroy();
      console.log('\nOllama timeout - pas de reponse');
      resolve(false);
    });
  });
}

async function main() {
  await checkSupabase();
  await checkOllama();
}

main().catch(console.error);
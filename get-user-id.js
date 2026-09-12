const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vmmicbfoobdbtikcqxel.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbWljYmZvb2JkYnRpa2NxeGVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzc2ODY1NSwiZXhwIjoyMTAzMzQ0NjU1fQ.Ws3GGccCAzgZ9FcxpIOWN6O2yAVu70DsYJ-tLHpJFwY',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function findUser() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, google_email, password, status')
    .eq('email', 'clientwebg2@gmail.com')
    .maybeSingle();

  if (error) {
    console.error('Erreur:', error.message);
    return;
  }

  if (!data) {
    console.log('User non trouve. Listing tous les users...');
    const { data: all } = await supabase.from('users').select('id, email, status').limit(10);
    console.log('Users trouves:', all);
    return;
  }

  console.log('========================================');
  console.log('  USER TROUVE');
  console.log('========================================');
  console.log('ID:', data.id);
  console.log('Email:', data.email);
  console.log('Google Email:', data.google_email);
  console.log('Has Password:', !!data.password);
  console.log('Status:', data.status);
  console.log('');
  console.log('Commande pour lancer la validation:');
  console.log('curl -X POST http://localhost:8080/api/validate-account-now/' + data.id);
  console.log('');
  console.log('OU depuis PowerShell:');
  console.log('Invoke-RestMethod -Uri http://localhost:8080/api/validate-account-now/' + data.id + ' -Method POST -UseBasicParsing');
}

findUser().catch(console.error);
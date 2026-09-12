/**
 * Test Ollama - Generation avis Google Business
 */
async function testOllama() {
  const companyName = 'Boulangerie Dupont';
  const category = 'boulangerie';
  const rating = 5;

  console.log('========================================');
  console.log('  TEST OLLAMA - GENERATION AVIS');
  console.log('========================================\n');

  try {
    const prompt = 'Tu es un client francais lambda. Redige un avis Google authentique de ' + rating + ' etoiles pour l entreprise ' + companyName + ' (categorie: ' + category + '). L avis doit faire 2 a 4 phrases, naturel, sans fautes d orthographe evidentes. Ne mentionne jamais que tu es une IA. Reponds UNIQUEMENT avec le texte de l avis, sans preambule.';

    console.log('Prompt envoye a Ollama...');
    console.log('Modele: llama3.2:latest\n');

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      console.error('Erreur HTTP:', response.status, response.statusText);
      return;
    }

    const data = await response.json();
    console.log('✅ REPONSE OLLAMA:');
    console.log('----------------------------------------');
    console.log(data.response ? data.response.trim() : (data.text ? data.text.trim() : 'ERREUR'));
    console.log('----------------------------------------');

  } catch (error) {
    console.error('❌ ERREUR OLLAMA:', error.message);
    console.log('\nVerifie que Ollama tourne:');
    console.log('  ollama run llama3.2');
  }
}

testOllama();
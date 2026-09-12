with open(r'C:\Users\Leo\cademo\review-post-submit-page.html', 'r', encoding='utf-8') as f:
    html = f.read().lower()

failure_signals = ["une erreur","error","try again","réessayer","votre avis n'a pas","not posted","remplir","obligatoire","required","veuillez","please","invalid","invalide"]
success_signals = ["merci","publie","publié","posted","thank","votre avis","avis publié","success","confirmé","enregistré","saved"]

print("=== FAILURE SIGNALS FOUND ===")
for f in failure_signals:
    if f in html:
        idx = html.index(f)
        print(f"  '{f}' at pos {idx}: ...{html[max(0,idx-50):idx+100]}...")

print("\n=== SUCCESS SIGNALS FOUND ===")
for s in success_signals:
    if s in html:
        idx = html.index(s)
        print(f"  '{s}' at pos {idx}: ...{html[max(0,idx-50):idx+100]}...")

print(f"\nTotal HTML length: {len(html)}")

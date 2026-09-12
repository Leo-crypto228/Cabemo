import re
with open(r'C:\Users\Leo\cademo\review-form-html-dump.html', 'r', encoding='utf-8') as f:
    html = f.read()

results = []
for i, m in enumerate(re.finditer(r'<textarea[^>]*>', html)):
    start = max(0, m.start() - 300)
    end = min(len(html), m.end() + 300)
    snippet = html[start:end]
    results.append(f"\n=== TEXTAREA {i} ===\n{snippet}\n")

with open(r'C:\Users\Leo\cademo\textarea_contexts.txt', 'w', encoding='utf-8') as out:
    out.write('\n'.join(results))
print("Done. Check textarea_contexts.txt")

import re
with open(r'C:\Users\Leo\cademo\review-form-html-dump.html', 'r', encoding='utf-8') as f:
    html = f.read()
print(f"HTML length: {len(html)}")

m = re.search(r'<input[^>]*class=["\'][^"\']*yBHhWb[^"\']*["\'][^>]*>', html)
if m:
    start = max(0, m.start() - 300)
    end = min(len(html), m.end() + 300)
    print("Found input yBHhWb:")
    print(html[start:end])
else:
    print("input yBHhWb not found")

m2 = re.search(r'<[^>]*class=["\'][^"\']*yBHhWb[^"\']*["\'][^>]*>', html)
if m2:
    start = max(0, m2.start() - 300)
    end = min(len(html), m2.end() + 300)
    print("Found element with yBHhWb:")
    print(html[start:end])
else:
    print("No element with yBHhWb")

for keyword in ['contenteditable', 'role="textbox"', 'textarea', 'data-focus-id']:
    count = html.count(keyword)
    print(f"{keyword}: {count} occurrences")

# Find all textarea contexts
for m in re.finditer(r'<textarea[^>]*>', html):
    start = max(0, m.start() - 200)
    end = min(len(html), m.end() + 200)
    snippet = html[start:end]
    print("\n--- textarea ---")
    print(snippet[:500])

import re
with open(r'C:\Users\Leo\cademo\review-form-html-dump.html', 'r', encoding='utf-8') as f:
    html = f.read()
print(f'HTML length: {len(html)}')
iframes = re.findall(r'<iframe[^>]*src=["\']([^"\']*)["\'][^>]*>', html)
print(f'Iframes found: {len(iframes)}')
for src in iframes[:5]:
    print(f'  iframe src: {src[:100]}')
shadows = re.findall(r'shadowroot|shadowRoot|attachShadow', html)
print(f'Shadow DOM references: {len(shadows)}')
for kw in ['Partagez', 'expérience', 'share your experience', 'Rédiger']:
    if kw.lower() in html.lower():
        print(f'Found keyword: {kw}')
# Search for any input/textarea after the star rating area
matches = re.findall(r'<(input|textarea)[^>]*>', html)
print(f'Total input/textarea tags: {len(matches)}')
for m in matches[:10]:
    print(f'  {m[:200]}')

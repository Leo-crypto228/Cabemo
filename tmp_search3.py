import re
f=open(r'C:\Users\Leo\cademo\review-form-html-dump.html','r',encoding='utf-8')
c=f.read()
f.close()

# Find jsaction containing review
matches = re.findall(r'jsaction="([^"]*review[^"]*)"', c, re.IGNORECASE)
print('jsaction review:', len(matches))
for m in matches[:10]:
    print(' ', m)

# Find any button or div containing review-related text
for term in ['reviewdialog', 'write a review', 'compose', 'form']:
    idx = c.lower().find(term)
    print(term, 'at', idx)

# Find role=dialog
matches = re.findall(r'role="dialog"', c, re.IGNORECASE)
print('role=dialog count:', len(matches))

# Find specific classes
for cls in ['U6stEc', 'y0xkzf', 'fIuPR']:
    print(cls, 'count:', c.count(cls))

import re
f=open(r'C:\Users\Leo\cademo\review-form-html-dump.html','r',encoding='utf-8')
c=f.read()
f.close()

m=re.findall(r'aria-label="([^"]*(?:etoile|star|Star)[^"]*)"', c, re.IGNORECASE)
print('Stars:', len(m))
print(m[:10])
print('---')

m2=re.findall(r'<textarea[^>]*>', c, re.IGNORECASE)
print('Textareas:', len(m2))
print(m2[:3])
print('---')

m3=re.findall(r'<div[^>]*contenteditable[^>]*>', c, re.IGNORECASE)
print('Contenteditables:', len(m3))
print(m3[:3])
print('---')

m4=re.findall(r'<div[^>]*role="textbox"[^>]*>', c, re.IGNORECASE)
print('Role=textbox:', len(m4))
print(m4[:3])
print('---')

# Look for radio buttons
m5=re.findall(r'<input[^>]*type="radio"[^>]*>', c, re.IGNORECASE)
print('Radios:', len(m5))
print(m5[:5])

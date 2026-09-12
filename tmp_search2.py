f=open(r'C:\Users\Leo\cademo\review-form-html-dump.html','r',encoding='utf-8')
c=f.read()
f.close()
# Context around textarea
idx = c.find('textarea')
print('=== textarea context ===')
print(c[max(0,idx-200):idx+500])
print('\n')
# Context around radio
idx = c.find('type="radio"')
print('=== radio context ===')
print(c[max(0,idx-200):idx+500])
print('\n')
# Context around etoile
idx = c.find('étoile')
print('=== etoile context ===')
print(c[max(0,idx-200):idx+500])

with open('C:/Users/Leo/cademo/index.html','r',encoding='utf-8') as f:
    s = f.read()
print('File length:', len(s))
print('handlePasswordNext found:', 'handlePasswordNext' in s)
print('cademoLogin found:', 'function cademoLogin' in s)
print('border-radius:24px count:', s.count('border-radius:24px'))
print('padding:24px 16px;box-sizing:border-box count:', s.count('padding:24px 16px;box-sizing:border-box'))
print('setTimeout in supabaseReady:', 'setTimeout(function () { finish(null); }, 4000)' in s)
# check password button
idx = s.find('page-password')
print('page-password section cademoLogin:', 'cademoLogin' in s[idx:idx+500])

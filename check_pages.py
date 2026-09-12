with open('C:/Users/Leo/cademo/index.html','r',encoding='utf-8') as f:
    lines = f.readlines()
targets = ['page-start', 'page-email', 'page-password', 'page-captcha', 'page-mail-info']
for i, line in enumerate(lines, 1):
    for t in targets:
        if ('id="' + t + '"') in line:
            print(i, line.rstrip()[:120])
            if i < len(lines): print('  ', lines[i].rstrip()[:120])
            if i+1 < len(lines): print('  ', lines[i+1].rstrip()[:120])
            print('---')

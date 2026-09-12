with open('C:/Users/Leo/cademo/index.html','r',encoding='utf-8') as f:
    s = f.read()

for name in ['page-email', 'page-password', 'page-captcha', 'page-mail-info']:
    idx = s.find('id="' + name + '"')
    if idx != -1:
        print(name)
        print(s[idx-20:idx+80])
        print('---')

# Check for remaining 30px logos
import re
for m in re.finditer(r'width:30px;height:30px', s):
    print('REMAINING 30px logo at', m.start())

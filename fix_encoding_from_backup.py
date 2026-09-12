import difflib

def read_lines(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read().splitlines()

act_lines = read_lines('C:/Users/Leo/cademo/index.html')
back_lines = read_lines('C:/Users/Leo/cademo/index.html.backup-auth-replacement.html')

# Use SequenceMatcher on lines to find correspondences
sm = difflib.SequenceMatcher(None, act_lines, back_lines)

fixed = []
opcodes = sm.get_opcodes()

for tag, i1, i2, j1, j2 in opcodes:
    if tag == 'equal':
        # Lines match exactly, keep actual lines
        fixed.extend(act_lines[i1:i2])
    elif tag == 'replace':
        # Try to map lines one-to-one within the replaced block
        act_block = act_lines[i1:i2]
        back_block = back_lines[j1:j2]
        # Use a local SequenceMatcher for these blocks
        sm_local = difflib.SequenceMatcher(None, act_block, back_block)
        local_opcodes = sm_local.get_opcodes()
        for ltag, li1, li2, lj1, lj2 in local_opcodes:
            if ltag == 'equal':
                fixed.extend(act_block[li1:li2])
            elif ltag == 'replace':
                # Try line-by-line mapping
                for a_idx, b_idx in zip(range(li1, li2), range(lj1, lj2)):
                    a_line = act_block[a_idx]
                    b_line = back_block[b_idx]
                    if '\ufffd' in a_line and '\ufffd' not in b_line:
                        fixed.append(b_line)
                    else:
                        fixed.append(a_line)
                # Handle remaining lines if lengths differ
                if li2 - li1 > lj2 - lj1:
                    fixed.extend(act_block[li1 + (lj2 - lj1):li2])
                elif lj2 - lj1 > li2 - li1:
                    fixed.extend(back_block[lj1 + (li2 - lj1):lj2])
            elif ltag == 'delete':
                fixed.extend(act_block[li1:li2])
            elif ltag == 'insert':
                fixed.extend(back_block[lj1:lj2])
    elif tag == 'delete':
        fixed.extend(act_lines[i1:i2])
    elif tag == 'insert':
        # Lines present in backup but not in actual - we might want to keep them if they don't corrupt structure
        fixed.extend(back_lines[j1:j2])

with open('C:/Users/Leo/cademo/index.html', 'w', encoding='utf-8') as f:
    f.write('\n'.join(fixed))
    f.write('\n')

# Count remaining replacement chars
with open('C:/Users/Leo/cademo/index.html', 'r', encoding='utf-8') as f:
    remaining = f.read().count('\ufffd')
print('Fixed. Remaining replacement chars:', remaining)

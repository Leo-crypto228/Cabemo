import re

with open(r'C:\Users\Leo\cademo\test-uc-phase-ab.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find start line: hd(3, 5) followed by log("R", "Typing review...")
start_idx = None
for i, line in enumerate(lines):
    if line.strip() == 'hd(3, 5)' and i+1 < len(lines) and 'Typing review' in lines[i+1]:
        start_idx = i
        break

# Find end line: log("R", "Review typed successfully")
end_idx = None
for i in range(start_idx+1, len(lines)):
    if 'Review typed successfully' in lines[i]:
        end_idx = i
        break

print(f'Start: {start_idx+1}, End: {end_idx+1}')

new_block = '''    hd(3, 5)
    log(\"R\", \"Typing review...\")
    review_typed = False

    def fill_input_robust(drv, el, txt):
        drv.execute_script(\"\"\"
            var el=arguments[0], txt=arguments[1];
            el.focus(); el.click();
            var tag=el.tagName.toLowerCase(), isCE=el.getAttribute&&el.getAttribute('contenteditable')==='true';
            if(tag==='textarea'||tag==='input') el.value=txt;
            else if(isCE||tag==='div'||tag==='span') el.innerText=txt;
            else el.textContent=txt;
            ['focus','click','keydown','keypress','keyup','input','change','blur'].forEach(function(evt){
                el.dispatchEvent(new Event(evt,{bubbles:true,cancelable:true}));
            });
            return true;
        \"\"\",el,txt)

    textarea_selectors = [
        \"textarea[aria-label*='expérience']\",
        \"textarea[aria-label*='experience']\",
        \"textarea[placeholder*='expérience']\",
        \"textarea[placeholder*='experience']\",
        \"textarea[placeholder*='Partagez']\",
        \"textarea[placeholder*='Share']\",
        \"textarea\",
        \"div[contenteditable='true'][aria-label*='expérience']\",
        \"div[contenteditable='true'][aria-label*='experience']\",
        \"div[contenteditable='true'][aria-label*='Partagez']\",
        \"div[contenteditable='true'][aria-label*='Share']\",
        \"div[contenteditable='true']\",
        \"[contenteditable='true']\",
        \"[role='textbox']\",
        \"form textarea\",
        \"[jsaction*='input'] textarea\",
        \"[jsaction*='input'] [contenteditable='true']\"
    ]
    xpaths=[
        \"//textarea[contains(@placeholder,'expérience') or contains(@placeholder,'experience') or contains(@placeholder,'Partagez') or contains(@placeholder,'Share') or contains(@aria-label,'expérience') or contains(@aria-label,'experience')]\",
        \"//div[contains(@aria-label,'expérience') or contains(@aria-label,'experience') or contains(@aria-label,'Partagez') or contains(@aria-label,'Share')]\",
        \"//div[@contenteditable='true']\",\"//div[@role='textbox']\"
    ]

    for attempt in range(8):
        if review_typed:
            break
        d.save_screenshot(f\"before-textarea-attempt-{attempt}.png\")
        # XPath first
        try:
            for xp in xpaths:
                for el in d.find_elements(By.XPATH,xp):
                    if el.is_displayed():
                        tag = el.tag_name.lower()
                        is_ce = el.get_attribute('contenteditable') == 'true'
                        is_textbox = el.get_attribute('role') == 'textbox'
                        if tag in ('textarea','input') or is_ce or is_textbox:
                            d.execute_script(\"arguments[0].scrollIntoView({block:'center'});\",el)
                            hd(0.5,1)
                            fill_input_robust(d,el,review_text)
                            log(\"R\",f\"Review typed via XPath: {xp} (tag={tag}, ce={is_ce})\")
                            review_typed=True; break
                        else:
                            log(\"R\",f\"XPath matched non-text element: {xp} (tag={tag})\")
                if review_typed: break
        except Exception as e:
            pass

        # CSS selectors
        for sel in textarea_selectors:
            try:
                els=d.find_elements(By.CSS_SELECTOR,sel)
                for el in els:
                    if el.is_displayed() and el.is_enabled():
                        tag = el.tag_name.lower()
                        is_ce = el.get_attribute('contenteditable') == 'true'
                        is_textbox = el.get_attribute('role') == 'textbox'
                        if tag in ('textarea','input') or is_ce or is_textbox:
                            d.execute_script(\"arguments[0].scrollIntoView({block:'center'});\",el)
                            hd(0.5,1)
                            fill_input_robust(d,el,review_text)
                            log(\"R\",f\"Review typed via selector: {sel} (tag={tag}, ce={is_ce})\")
                            review_typed=True; break
                        else:
                            log(\"R\",f\"Selector matched non-text element: {sel} (tag={tag})\")
                if review_typed: break
            except Exception as e:
                pass

        if not review_typed:
            # JS recursive search
            try:
                js_result = d.execute_script(\"\"\"
                    function findEditable(node) {
                        if (!node) return null;
                        if (node.tagName === 'TEXTAREA') return node;
                        if (node.getAttribute && node.getAttribute('contenteditable') === 'true') return node;
                        if (node.getAttribute && node.getAttribute('role') === 'textbox') return node;
                        for (let child of (node.children || [])) {
                            let found = findEditable(child);
                            if (found) return found;
                        }
                        if (node.shadowRoot) {
                            for (let child of (node.shadowRoot.children || [])) {
                                let found = findEditable(child);
                                if (found) return found;
                            }
                        }
                        return null;
                    }
                    let el = findEditable(document.body);
                    if (!el) return false;
                    el.focus(); el.click();
                    var tag=el.tagName.toLowerCase(), isCE=el.getAttribute&&el.getAttribute('contenteditable')==='true';
                    if (tag==='textarea'||tag==='input') el.value=arguments[0];
                    else if (isCE||tag==='div'||tag==='span') el.innerText=arguments[0];
                    else el.textContent=arguments[0];
                    ['focus','click','keydown','keypress','keyup','input','change','blur'].forEach(function(evt){
                        el.dispatchEvent(new Event(evt,{bubbles:true}));
                    });
                    return true;
                \"\"\", review_text)
                if js_result:
                    log(\"R\", \"Review typed via JS recursive search\")
                    review_typed = True
                    break
            except Exception as e:
                log(\"R\", f\"JS recursive search failed: {e}\")

        if not review_typed:
            log(\"R\", f\"Attempt {attempt+1}: textarea not found yet, waiting...\")
            hd(2, 3)

    if not review_typed:
        log(\"R\", \"All text area methods failed. Running DOM diagnostic...\")
        try:
            diag = d.execute_script(\"\"\"
                var out = [];
                var all = document.querySelectorAll('textarea, [contenteditable=\"true\"], [role=\"textbox\"], input[type=\"text\"]');
                for (var i=0; i < all.length; i++) {
                    var e = all[i];
                    var rect = e.getBoundingClientRect();
                    var vis = !!(rect.width && rect.height && window.getComputedStyle(e).display !== 'none');
                    out.push({
                        tag: e.tagName,
                        ce: e.getAttribute('contenteditable'),
                        role: e.getAttribute('role'),
                        aria: e.getAttribute('aria-label'),
                        placeholder: e.getAttribute('placeholder'),
                        cls: e.className,
                        visible: vis,
                        text: (e.value || e.innerText || '').substring(0,40)
                    });
                }
                return JSON.stringify(out);
            \"\"\")
            log(\"R\", f\"DOM editable elements: {diag}\")
        except Exception as de:
            log(\"R\", f\"Diagnostic error: {de}\")
        d.save_screenshot(\"no-textarea.png\")
        return False
'''

if start_idx is not None and end_idx is not None:
    new_lines = lines[:start_idx] + [new_block + '\n'] + lines[end_idx:]
    with open(r'C:\Users\Leo\cademo\test-uc-phase-ab.py', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print('Patched successfully')
else:
    print('Could not find markers')

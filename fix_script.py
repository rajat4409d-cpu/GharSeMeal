import re

def fix():
    with open('index.html', 'r', encoding='utf-8') as f:
        text = f.read()

    def replace_onclick(m):
        val = m.group(1)
        if 'alert' in val or 'window.open' in val or 'event.preventDefault()' in val or 'document.getElementById' in val or 'app.' in val:
            return m.group(0)
        return 'onclick="app.' + val + '"'

    new_text = re.sub(r'onclick="([^"]+)"', replace_onclick, text)

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_text)

    with open('app.js', 'a', encoding='utf-8') as f:
        f.write('\nwindow.app = app;\n')

    print("Success")

if __name__ == "__main__":
    fix()

import re

with open('index.html', encoding='utf-8') as f:
    content = f.read()

with open('app.js', encoding='utf-8') as f:
    js = f.read()

ids_in_js = set(re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", js))
ids_in_html = set(re.findall(r'id=["\']([^"\']+)["\']', content))

missing = ids_in_js - ids_in_html
print('IDs referenced in app.js but missing in index.html:')
for m in sorted(missing):
    print(' ', m)

print(f'\nTotal IDs in app.js: {len(ids_in_js)}')
print(f'Total IDs in index.html: {len(ids_in_html)}')

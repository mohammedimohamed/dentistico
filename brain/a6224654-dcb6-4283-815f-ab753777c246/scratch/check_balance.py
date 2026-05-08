
import re

content = open(r'd:\source\svelt\dentistico\src\routes\admin\settings\+page.svelte', 'r', encoding='utf-8').read()

div_open = len(re.findall(r'<div[\s>]', content))
div_close = content.count('</div>')
form_open = len(re.findall(r'<form[\s>]', content))
form_close = content.count('</form>')
if_open = content.count('{#if')
if_close = content.count('{/if}')

print(f"DIV: {div_open} open, {div_close} close")
print(f"FORM: {form_open} open, {form_close} close")
print(f"IF: {if_open} open, {if_close} close")

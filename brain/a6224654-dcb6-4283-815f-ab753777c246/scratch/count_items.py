
content = open(r'd:\source\svelt\dentistico\src\routes\admin\settings\+page.svelte', 'r', encoding='utf-8').read()
lines = content.split('\n')

start_grid = 737
end_grid = 1168

grid_content = '\n'.join(lines[start_grid-1:end_grid])

# Find all direct child divs of the grid
import re
# This is hard with regex, I'll just count the level 1 divs
level = 0
items = 0
for line in grid_content.split('\n'):
    open_count = line.count('<div')
    close_count = line.count('</div>')
    
    if level == 1 and open_count > 0:
        # Check if this line starts a new top-level div in the grid
        if line.strip().startswith('<div'):
             items += 1
    
    level += open_count - close_count

print(f"Total top-level items in grid: {items}")

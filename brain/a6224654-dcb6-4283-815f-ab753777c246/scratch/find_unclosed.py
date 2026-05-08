
content = open(r'd:\source\svelt\dentistico\src\routes\admin\settings\+page.svelte', 'r', encoding='utf-8').read()
lines = content.split('\n')

start_line = 713
end_line = 1181

for i in range(start_line - 1, end_line):
    line = lines[i]
    if '<p' in line and '</p>' not in line:
        # Check if it closes on a subsequent line
        j = i + 1
        found = False
        while j < len(lines) and j < i + 10: # Look ahead 10 lines
            if '</p>' in lines[j]:
                found = True
                break
            if '<p' in lines[j]: # Found another open tag before close
                break
            j += 1
        if not found:
            print(f"Potential unclosed <p> at line {i+1}: {line.strip()}")

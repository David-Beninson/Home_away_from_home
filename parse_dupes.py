import json

with open('dupes.json', 'r') as f:
    data = json.load(f)

for idx, group in enumerate(data.get('clone_groups', [])[:15]):
    files = [inst['file'] for inst in group['instances']]
    lines = group['line_count']
    print(f"Group {idx+1} ({lines} lines across {len(files)} instances in {', '.join(set(files))}):")
    # print snippet of first instance
    print("Snippet:")
    snippet = group['instances'][0]['fragment']
    print('\n'.join(snippet.split('\n')[:10]))
    print("-" * 40)

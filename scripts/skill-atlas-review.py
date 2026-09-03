import json, pathlib
src = pathlib.Path('src/editor/skill-atlas/skillTrees.ts')
text = src.read_text()
trees = json.loads(text.split('= ', 1)[1].split('\n};', 1)[0] + '\n}')
lines = text.split('\n')

def line_of(needle, start=0):
    for i in range(start, len(lines)):
        if needle in lines[i]:
            return i + 1

out_dir = pathlib.Path('scratch/skill-atlas-review')
out_dir.mkdir(parents=True, exist_ok=True)
index = ['# Skill atlas review', '',
 'One file per skill. Line numbers refer to `src/editor/skill-atlas/skillTrees.ts`. Each node lists its title, description, chips, outputs, and any decision-tree flag. Regenerate with `python3 scripts/skill-atlas-review.py`.', '',
 '## Flag rules', '',
 '- **Branch labels.** Every fan-out edge names the answer that selects it.',
 '- **Decision forks.** Every fan-out begins at a decision. Labelled CLI exit-code branches form the command exception.',
 '- **Decision titles.** Every decision title ends in a question mark.',
 '- **Decision exits.** Every decision has multiple forward outputs or answer chips. A single-output node becomes a step.',
 '- **Path endings.** Verify and hand-off nodes end paths; process nodes continue to an output.',
 '- **Duplicate copy.** The description adds information beyond the title.', '',
 '| Skill | Nodes | Flags |', '|---|---|---|']


for key, tree in trees.items():
    tree_line = line_of(f'"{key}": {{')
    nodes = {n['id']: n for n in tree['nodes']}
    outs, ins = {}, {}
    for e in tree['edges']:
        outs.setdefault(e['from'], []).append(e)
        ins.setdefault(e['to'], []).append(e)
    tag_line = line_of('"tagline"', tree_line)
    md = [f"# {tree['title']} (`{tree['id']}`)", '',
          f"Source: `skillTrees.ts:{tree_line}`. Tagline at L{tag_line}:", '',
          f"> {tree['tagline']}", '']
    total = 0
    for n in sorted(tree['nodes'], key=lambda node: node['row']):
        id_line = line_of(f'"id": "{n["id"]}"', tree_line)
        title_line = line_of('"title"', id_line)
        head = f"### L{title_line} `{n['id']}` · {n['kind']}"
        if n.get('n'):
            head += f" · step {n['n']}"
        if n.get('tag'):
            head += f" · tag: {n['tag']}"
        md += [head, '', f"**Title:** {n['title']}", '']
        if n.get('desc'):
            md += [f"**Description:** {n['desc']}", '']
        if n.get('reference'):
            md += [f"**Reference:** `{n['reference']}`", '']
        if n.get('chips'):
            md.append('**Chips:**')
            for c in n['chips']:
                cl = line_of('"label": "' + c['label'] + '"', id_line)
                md.append(f"- L{cl} {c['label']}")
            md.append('')
        o = outs.get(n['id'], [])
        if o:
            md.append('**Outputs:**')
            for e in o:
                back = ' (loops back)' if e.get('back') else ''
                answer = f"**{e['label']}** → " if e.get('label') else ''
                md.append(f"- {answer}`{e['to']}` {nodes[e['to']]['title']}{back}")
            md.append('')
        else:
            md += ['**Outputs:** none', '']
        flags = []
        fwd = [e for e in o if not e.get('back')]
        kind = n['kind']
        unlabelled = [e for e in o if not e.get('label')]
        if len(o) >= 2 and unlabelled:
            flags.append(f"Branch labels: {len(unlabelled)} of {len(o)} edges need an answer.")
        if kind in ('decide', 'ask'):
            if not n['title'].endswith('?'):
                flags.append('Decision title needs question form.')
            if len(o) == 1 and not n.get('chips'):
                flags.append('Decision exits: add another output or answer chips, or make this node a step.')
        elif len(o) >= 2:
            if kind != 'cli' or not all(e.get('label') for e in o):
                flags.append(f"Decision fork: this {kind} node has {len(o)} outputs.")
        if kind not in ('done', 'hand') and not o:
            flags.append('Path ending: add an output or mark this node as verify or hand-off.')
        if n['id'] not in ins and kind != 'trigger':
            flags.append('Reachability: connect an input edge.')
        if n.get('desc') and n['desc'].strip('.') == n['title'].strip('.'):
            flags.append('Duplicate copy: description repeats the title.')
        if flags:
            total += len(flags)
            md += ['**Flags:**'] + [f"- {f}" for f in flags] + ['']
        md += ['---', '']
    (out_dir / f'{key}.md').write_text('\n'.join(md) + '\n')
    index.append(f"| [{key}]({key}.md) | {len(tree['nodes'])} | {total} |")
(out_dir / 'README.md').write_text('\n'.join(index) + '\n')
print('\n'.join(index[-8:]))

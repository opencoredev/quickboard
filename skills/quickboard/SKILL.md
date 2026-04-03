---
name: quickboard
description: >-
  Use the QuickBoard MCP to create and draw on live whiteboards.
  Create boards, add shapes/text/arrows, use mermaid for simple flows,
  and share live URLs with users.
version: 2.1.0
author: opencoredev
tags: [mcp, whiteboard, diagrams, visualization]
---

# QuickBoard

Create a board, add elements, share the URL. Users see it live.

## Tools

- **create_board** - Returns `board_id`, `secret`, `url`. Save the secret.
- **get_board** - Public. No secret needed.
- **add_elements** - Add shapes/text/mermaid. Requires `secret`.
- **clear_board** - Wipe the board. Requires `secret`.

## Workflow

1. `create_board` → save `secret` → share URL with user immediately
2. `add_elements` with board_id + secret
3. Reuse the same board. Only create new for a new topic.

## Elements

```json
{"type": "rectangle", "x": 100, "y": 100, "width": 200, "height": 80, "backgroundColor": "#a5d8ff"}
{"type": "ellipse", "x": 100, "y": 100, "width": 120, "height": 120, "backgroundColor": "#b2f2bb"}
{"type": "diamond", "x": 100, "y": 100, "width": 140, "height": 100, "backgroundColor": "#ffec99"}
{"type": "text", "x": 100, "y": 100, "text": "Hello", "fontSize": 20}
{"type": "arrow", "x": 100, "y": 180, "width": 0, "height": 80, "points": [[0,0],[0,80]]}
```

Colors: `#a5d8ff` blue, `#b2f2bb` green, `#ffec99` yellow, `#ffc9c9` red, `#d0bfff` purple, `#dee2e6` grey

## Mermaid (max 8 nodes!)

Only for simple linear flows. For anything complex, use direct elements.

```json
{"mermaid": "flowchart TD\n  A[Start] --> B{OK?}\n  B -->|Yes| C[Done]\n  B -->|No| D[Retry]"}
```

## Complex Diagrams: Use Direct Elements

Lay it out yourself — main path at x=300 going down, branches to the right at x=600:

```json
[
  {"type":"rectangle","x":200,"y":100,"width":220,"height":60,"backgroundColor":"#a5d8ff"},
  {"type":"text","x":230,"y":115,"text":"Step 1","fontSize":18},
  {"type":"arrow","x":310,"y":160,"width":0,"height":60,"points":[[0,0],[0,60]]},
  {"type":"diamond","x":210,"y":230,"width":200,"height":100,"backgroundColor":"#ffec99"},
  {"type":"text","x":270,"y":265,"text":"OK?","fontSize":16},
  {"type":"arrow","x":310,"y":330,"width":0,"height":60,"points":[[0,0],[0,60]]},
  {"type":"rectangle","x":200,"y":400,"width":220,"height":60,"backgroundColor":"#b2f2bb"},
  {"type":"text","x":230,"y":415,"text":"Done","fontSize":18}
]
```

## Security

- All writes require `secret` from `create_board`
- `get_board` is public (view-only)
- Boards expire 7 days after last edit

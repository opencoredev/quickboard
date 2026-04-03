---
name: quickboard
description: >-
  Use the QuickBoard MCP to create and draw on live whiteboards. Covers creating boards,
  adding shapes/text/arrows/diagrams, using mermaid syntax, and building visual layouts
  that users can view in real-time at a shareable URL.
version: 2.0.0
author: opencoredev
tags: [mcp, whiteboard, diagrams, visualization]
---

# QuickBoard MCP

QuickBoard gives you a live whiteboard canvas. Create a board, add elements, share the URL. The user sees everything in real-time.

## Tools

- **create_board** - Create a new board. Returns `board_id`, `secret`, and `url`.
- **get_board** - Get current elements on a board (public, no secret needed).
- **add_elements** - Add shapes, text, or mermaid diagrams. Requires `secret`.
- **clear_board** - Wipe the board. Requires `secret`.

## Workflow

1. Call `create_board` with a title
2. **Save the `secret`** - you need it for all write operations
3. Share the returned URL with the user immediately
4. Call `add_elements` with board_id + secret to draw

Always share the board URL right after creating so the user can watch live.

## Element Types

Each element needs `type`, `x`, `y`. Shapes also need `width` and `height`.

### Rectangles
```json
{"type": "rectangle", "x": 100, "y": 100, "width": 200, "height": 80, "backgroundColor": "#a5d8ff", "strokeColor": "#339af0"}
```

### Ellipses
```json
{"type": "ellipse", "x": 100, "y": 100, "width": 120, "height": 120, "backgroundColor": "#b2f2bb", "strokeColor": "#2f9e44"}
```

### Diamonds
```json
{"type": "diamond", "x": 100, "y": 100, "width": 140, "height": 100, "backgroundColor": "#ffec99", "strokeColor": "#f08c00"}
```

### Text
```json
{"type": "text", "x": 100, "y": 100, "text": "Hello", "fontSize": 20, "strokeColor": "#1e1e1e"}
```

### Arrows
```json
{"type": "arrow", "x": 100, "y": 100, "width": 200, "height": 0, "points": [[0, 0], [200, 0]]}
```

### Lines
```json
{"type": "line", "x": 100, "y": 100, "width": 200, "height": 0, "points": [[0, 0], [200, 0]]}
```

## Colors

- Blue: `#a5d8ff` (bg), `#339af0` (stroke)
- Green: `#b2f2bb` (bg), `#2f9e44` (stroke)
- Yellow: `#ffec99` (bg), `#f08c00` (stroke)
- Red: `#ffc9c9` (bg), `#e03131` (stroke)
- Purple: `#d0bfff` (bg), `#6741d9` (stroke)
- Gray: `#dee2e6` (bg), `#495057` (stroke)

## Mermaid Diagrams

Pass `mermaid` instead of `elements` to auto-generate a diagram:

```json
{
  "board_id": "<id>",
  "secret": "<secret>",
  "mermaid": "graph LR\n  A[Input] --> B[Process]\n  B --> C[Output]"
}
```

## Layout Tips

- Start at `x: 100, y: 100`
- Space elements ~250px apart horizontally, ~150px vertically
- For text inside shapes: offset `x + 10, y + 15` from shape position
- Use consistent widths (180-200px) for flowchart nodes
- Add all elements in one `add_elements` call for performance

## Security

- `create_board` returns a `secret` - store it
- All write tools (`add_elements`, `clear_board`) require the `secret`
- `get_board` is public - anyone with the board_id can view
- Board URLs are public read-only (users can view but not edit via MCP without the secret)
- Boards expire 7 days after last edit

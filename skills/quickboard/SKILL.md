---
name: quickboard
description: >-
  Use the QuickBoard MCP to create and draw on live whiteboards. Covers creating boards,
  adding shapes/text/arrows/diagrams, using mermaid syntax, and building visual layouts
  that users can view in real-time at a shareable URL.
version: 1.0.0
author: opencoredev
tags: [mcp, whiteboard, diagrams, excalidraw, visualization]
---

# QuickBoard MCP

QuickBoard gives you a live whiteboard canvas. You create a board, add elements to it, and share the URL. The user sees everything in real-time.

## Tools

You have these MCP tools:

- **create_board** - Create a new board. Returns `board_id` and `url`.
- **get_board** - Get current elements on a board.
- **add_elements** - Add shapes, text, or mermaid diagrams.
- **update_element** - Modify an existing element by ID.
- **delete_elements** - Remove elements by ID.
- **clear_board** - Wipe the board.

## Workflow

1. Call `create_board` with a title
2. Share the returned URL with the user
3. Call `add_elements` to draw on it

Always share the board URL immediately after creating it so the user can watch live.

## Element Types

Each element needs `type`, `x`, `y`. Shapes also need `width` and `height`.

### Rectangles
```json
{"type": "rectangle", "x": 100, "y": 100, "width": 200, "height": 80, "backgroundColor": "#a5d8ff", "fillStyle": "solid"}
```

### Ellipses
```json
{"type": "ellipse", "x": 100, "y": 100, "width": 120, "height": 120, "backgroundColor": "#b2f2bb", "fillStyle": "solid"}
```

### Diamonds
```json
{"type": "diamond", "x": 100, "y": 100, "width": 140, "height": 100, "backgroundColor": "#ffec99", "fillStyle": "solid"}
```

### Text
```json
{"type": "text", "x": 100, "y": 100, "text": "Hello", "fontSize": 20}
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

Use hex colors for `strokeColor` and `backgroundColor`:
- Blue: `#a5d8ff` (light), `#339af0` (medium), `#1971c2` (dark)
- Green: `#b2f2bb` (light), `#40c057` (medium), `#2f9e44` (dark)
- Yellow: `#ffec99` (light), `#fcc419` (medium), `#f08c00` (dark)
- Red: `#ffc9c9` (light), `#ff6b6b` (medium), `#e03131` (dark)
- Purple: `#d0bfff` (light), `#7950f2` (medium), `#6741d9` (dark)
- Gray: `#dee2e6` (light), `#868e96` (medium), `#495057` (dark)

Set `fillStyle` to `"solid"` when using `backgroundColor`. Default is transparent.

## Mermaid Diagrams

Pass a `mermaid` string instead of `elements` to auto-generate a visual diagram:

```json
{
  "board_id": "<id>",
  "mermaid": "graph LR\n  A[Input] --> B[Process]\n  B --> C[Output]"
}
```

This renders as positioned rectangles with arrows between them.

## Layout Tips

- Start at `x: 100, y: 100`
- Space elements ~250px apart horizontally, ~150px vertically
- Keep text inside shapes by offsetting `x + 10, y + 15` from the shape position
- Use consistent widths (180-200px) for nodes in a flowchart
- For labels inside shapes, set text width to `shape_width - 20`

## Example: Architecture Diagram

```json
{
  "board_id": "<id>",
  "elements": [
    {"type": "rectangle", "x": 100, "y": 100, "width": 180, "height": 60, "backgroundColor": "#a5d8ff", "fillStyle": "solid"},
    {"type": "text", "x": 140, "y": 115, "width": 100, "height": 30, "text": "Frontend", "fontSize": 16},
    {"type": "arrow", "x": 280, "y": 130, "width": 120, "height": 0, "points": [[0, 0], [120, 0]]},
    {"type": "rectangle", "x": 400, "y": 100, "width": 180, "height": 60, "backgroundColor": "#b2f2bb", "fillStyle": "solid"},
    {"type": "text", "x": 450, "y": 115, "width": 80, "height": 30, "text": "API", "fontSize": 16},
    {"type": "arrow", "x": 580, "y": 130, "width": 120, "height": 0, "points": [[0, 0], [120, 0]]},
    {"type": "rectangle", "x": 700, "y": 100, "width": 180, "height": 60, "backgroundColor": "#ffec99", "fillStyle": "solid"},
    {"type": "text", "x": 740, "y": 115, "width": 100, "height": 30, "text": "Database", "fontSize": 16}
  ]
}
```

## Key Points

- The board URL is live - the user sees changes as you make them
- Add all elements in one `add_elements` call when possible for performance
- Use `get_board` to check current state before modifying
- Elements persist for 7 days then auto-delete
- No authentication needed

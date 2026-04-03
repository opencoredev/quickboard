# QuickBoard

Instant whiteboards that AI agents can draw on via MCP. No sign-up required.

Create a board, share the MCP endpoint URL, and watch your agent build diagrams in real-time. Boards auto-delete after 3 days.

## Features

- **Excalidraw Canvas** - Full drawing experience with shapes, text, arrows, freehand, and more
- **MCP Endpoint** - Single URL for AI agents to create and draw on boards
- **Real-time Sync** - Changes from agents appear on the canvas instantly via Convex subscriptions
- **Mermaid Diagrams** - Agents can send mermaid syntax and it renders as visual elements
- **Auto-cleanup** - Boards automatically deleted after 3 days
- **Dark/Light Mode** - Theme toggle with full Excalidraw theme integration
- **Rate Limited** - 30 requests/minute per IP on the MCP endpoint
- **No Auth Required** - Public, free, instant access

## Tech Stack

- **Frontend**: TanStack Start (React 19 + SSR) + Excalidraw + Tailwind CSS v4
- **Backend**: Convex (real-time database + serverless functions + HTTP actions)
- **UI**: shadcn/ui primitives (BaseUI + CVA)
- **Build**: Turborepo monorepo
- **Fonts**: DM Sans + Geist Mono

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.3.5
- A free [Convex](https://convex.dev) account

### Setup

```bash
# Install dependencies
bun install

# Configure Convex (creates a new project)
bun run dev:setup

# Copy the Convex URL to the web app
# The URL is in packages/backend/.env.local (CONVEX_URL)
# Paste it into apps/web/.env as VITE_CONVEX_URL

# Start development
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) to start creating boards.

## MCP Integration

The MCP endpoint is available at your Convex deployment's HTTP actions URL:

```
https://<your-deployment>.convex.site/mcp
```

### Add to your AI agent

Add this to your MCP client configuration (e.g., Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "quickboard": {
      "url": "https://<your-deployment>.convex.site/mcp"
    }
  }
}
```

### Available Tools

| Tool | Description |
|------|-------------|
| `create_board` | Create a new whiteboard, returns board ID and live URL |
| `get_board` | Get current board state with all elements |
| `add_elements` | Add shapes, text, or mermaid diagrams to a board |
| `update_element` | Update properties of an existing element |
| `delete_elements` | Remove specific elements by ID |
| `clear_board` | Remove all elements from a board |

### Example: Agent creates a flowchart

```json
{
  "name": "add_elements",
  "arguments": {
    "board_id": "<board-id>",
    "mermaid": "graph LR\n  A[Start] --> B[Process]\n  B --> C[End]"
  }
}
```

### Example: Agent adds shapes

```json
{
  "name": "add_elements",
  "arguments": {
    "board_id": "<board-id>",
    "elements": [
      {"type": "rectangle", "x": 100, "y": 100, "width": 200, "height": 100, "backgroundColor": "#a5d8ff"},
      {"type": "text", "x": 120, "y": 130, "text": "Hello World", "fontSize": 20}
    ]
  }
}
```

## Project Structure

```
quickboard/
├── apps/
│   └── web/                    # TanStack Start frontend
│       └── src/
│           ├── routes/         # File-based routing
│           │   ├── index.tsx   # Home page (board list)
│           │   └── board.$boardId.tsx  # Board page (canvas)
│           └── components/
│               ├── excalidraw-canvas.tsx  # Excalidraw wrapper with Convex sync
│               ├── header.tsx
│               └── theme-toggle.tsx
├── packages/
│   ├── backend/                # Convex backend
│   │   └── convex/
│   │       ├── schema.ts       # Database schema
│   │       ├── boards.ts       # Board CRUD functions
│   │       ├── http.ts         # MCP endpoint + rate limiting
│   │       ├── crons.ts        # Auto-delete old boards
│   │       └── rateLimit.ts    # Rate limiter
│   ├── ui/                     # Shared shadcn/ui components
│   ├── env/                    # Environment validation
│   └── config/                 # Shared TypeScript config
```

## Development

```bash
bun run dev          # Start all services
bun run dev:web      # Frontend only
bun run check-types  # TypeScript type checking
bun run check        # Lint + format (Oxlint + Oxfmt)
```

## Deployment

1. Deploy Convex: `npx convex deploy`
2. Set the `SITE_URL` env var in Convex to your production frontend URL
3. Deploy the frontend to Vercel/Netlify/etc. with `VITE_CONVEX_URL` set to your production Convex URL

## License

MIT

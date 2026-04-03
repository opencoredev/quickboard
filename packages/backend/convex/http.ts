import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const MCP_TOOLS = [
  {
    name: "create_board",
    description:
      "Create a new whiteboard. Returns the board ID, a secret token for making changes, and a shareable URL where the board can be viewed live. Save the secret - you need it for all write operations.",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Title for the board (default: 'Untitled Board')",
        },
      },
    },
  },
  {
    name: "get_board",
    description:
      "Get the current state of a board including all elements (shapes, text, drawings). No secret needed.",
    inputSchema: {
      type: "object" as const,
      properties: {
        board_id: {
          type: "string",
          description: "The board ID to retrieve",
        },
      },
      required: ["board_id"],
    },
  },
  {
    name: "add_elements",
    description:
      "Add elements to a board. Requires the board secret. Supports rectangles, ellipses, diamonds, lines, arrows, text, and freehand drawings. You can also provide a mermaid diagram string which will be converted to elements.",
    inputSchema: {
      type: "object" as const,
      properties: {
        board_id: {
          type: "string",
          description: "The board ID to add elements to",
        },
        secret: {
          type: "string",
          description:
            "The board secret token returned from create_board. Required for write operations.",
        },
        elements: {
          type: "array",
          description:
            "Array of element objects to add. Each element needs at minimum: type, x, y. Supported types: rectangle, ellipse, diamond, line, arrow, text, freedraw.",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: [
                  "rectangle",
                  "ellipse",
                  "diamond",
                  "line",
                  "arrow",
                  "text",
                  "freedraw",
                ],
              },
              x: { type: "number", description: "X position" },
              y: { type: "number", description: "Y position" },
              width: {
                type: "number",
                description: "Width (default: 100)",
              },
              height: {
                type: "number",
                description: "Height (default: 100)",
              },
              text: {
                type: "string",
                description: "Text content (for text elements)",
              },
              strokeColor: {
                type: "string",
                description: "Stroke color (default: #1e1e1e)",
              },
              backgroundColor: {
                type: "string",
                description:
                  "Fill color (default: transparent). Use 'transparent' for no fill.",
              },
              strokeWidth: {
                type: "number",
                description: "Stroke width (default: 2)",
              },
              fontSize: {
                type: "number",
                description: "Font size for text (default: 20)",
              },
              points: {
                type: "array",
                description:
                  "Array of [x, y] points for line, arrow, and freedraw types",
                items: { type: "array", items: { type: "number" } },
              },
            },
            required: ["type", "x", "y"],
          },
        },
        mermaid: {
          type: "string",
          description:
            "A mermaid diagram string. Will be converted to visual elements on the board. Use this for flowcharts, sequence diagrams, etc.",
        },
      },
      required: ["board_id", "secret"],
    },
  },
  {
    name: "clear_board",
    description:
      "Remove all elements from a board. Requires the board secret.",
    inputSchema: {
      type: "object" as const,
      properties: {
        board_id: {
          type: "string",
          description: "The board ID to clear",
        },
        secret: {
          type: "string",
          description:
            "The board secret token returned from create_board. Required for write operations.",
        },
      },
      required: ["board_id", "secret"],
    },
  },
  {
    name: "update_element",
    description:
      "Update properties of an existing element on a board by its ID. Requires the board secret.",
    inputSchema: {
      type: "object" as const,
      properties: {
        board_id: {
          type: "string",
          description: "The board ID containing the element",
        },
        secret: {
          type: "string",
          description:
            "The board secret token returned from create_board. Required for write operations.",
        },
        element_id: {
          type: "string",
          description: "The element ID to update",
        },
        updates: {
          type: "object",
          description:
            "Properties to update (x, y, width, height, text, strokeColor, backgroundColor, etc.)",
        },
      },
      required: ["board_id", "secret", "element_id", "updates"],
    },
  },
  {
    name: "delete_elements",
    description:
      "Delete specific elements from a board by their IDs. Requires the board secret.",
    inputSchema: {
      type: "object" as const,
      properties: {
        board_id: {
          type: "string",
          description: "The board ID to delete elements from",
        },
        secret: {
          type: "string",
          description:
            "The board secret token returned from create_board. Required for write operations.",
        },
        element_ids: {
          type: "array",
          description: "Array of element IDs to delete",
          items: { type: "string" },
        },
      },
      required: ["board_id", "secret", "element_ids"],
    },
  },
];

function generateId(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function createElement(input: Record<string, unknown>) {
  const id = generateId();
  const element: Record<string, unknown> = {
    id,
    type: input.type as string,
    x: (input.x as number) ?? 0,
    y: (input.y as number) ?? 0,
    width: (input.width as number) ?? 100,
    height: (input.height as number) ?? 100,
    strokeColor: (input.strokeColor as string) ?? "#1e1e1e",
    backgroundColor: (input.backgroundColor as string) ?? "transparent",
    strokeWidth: (input.strokeWidth as number) ?? 2,
  };

  if (input.type === "text") {
    element.text = (input.text as string) ?? "";
    element.fontSize = (input.fontSize as number) ?? 20;
  }

  if (
    input.type === "line" ||
    input.type === "arrow" ||
    input.type === "freedraw"
  ) {
    element.points = (input.points as number[][]) ?? [
      [0, 0],
      [(input.width as number) ?? 100, (input.height as number) ?? 0],
    ];
  }

  return element;
}

function parseMermaidToElements(
  mermaid: string,
  startX = 100,
  startY = 100,
): Record<string, unknown>[] {
  const elements: Record<string, unknown>[] = [];
  const lines = mermaid.trim().split("\n");

  // Parse all node labels and edges
  const nodeLabels = new Map<string, string>();
  const nodeShapes = new Map<string, string>();
  const edges: { from: string; to: string; label: string }[] = [];
  const nodeOrder: string[] = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t || /^(graph|flowchart|sequenceDiagram|classDiagram|%%|Note|participant|alt|else|end)/i.test(t)) continue;

    // Parse: FROM_NODE -->|edge label| TO_NODE
    // First extract edge label if present (between pipes)
    let edgeLbl = "";
    let cleaned = t;
    const pipeLabelMatch = t.match(/\|([^|]*)\|/);
    if (pipeLabelMatch) {
      edgeLbl = pipeLabelMatch[1].trim();
      cleaned = t.replace(/\|[^|]*\|/, "");
    }
    // Match: FROM[label] --> TO[label]
    const m = cleaned.match(/(\w+)(?:\[([^\]]*)\]|\{([^}]*)\}|\(([^)]*)\))?\s*-+>?\s*(\w+)(?:\[([^\]]*)\]|\{([^}]*)\}|\(([^)]*)\))?/);
    if (!m) continue;

    const [, fId, fR, fD, fO, tId, tR, tD, tO] = m;
    const eLabel = edgeLbl;

    // Update labels (later definitions override)
    const fLabel = fR || fD || fO;
    const tLabel = tR || tD || tO;
    if (fLabel) nodeLabels.set(fId, fLabel);
    else if (!nodeLabels.has(fId)) nodeLabels.set(fId, fId);
    if (tLabel) nodeLabels.set(tId, tLabel);
    else if (!nodeLabels.has(tId)) nodeLabels.set(tId, tId);

    if (fD) nodeShapes.set(fId, "diamond");
    if (fO) nodeShapes.set(fId, "ellipse");
    if (tD) nodeShapes.set(tId, "diamond");
    if (tO) nodeShapes.set(tId, "ellipse");

    if (!nodeOrder.includes(fId)) nodeOrder.push(fId);
    if (!nodeOrder.includes(tId)) nodeOrder.push(tId);
    edges.push({ from: fId, to: tId, label: eLabel?.trim() || "" });
  }

  if (nodeOrder.length === 0) return elements;

  // --- Graph layout with BFS depth assignment ---
  const NODE_W = 220;
  const NODE_H = 55;
  const H_GAP = 80;
  const V_GAP = 80;

  // Build adjacency: parent -> [children in order]
  const children = new Map<string, string[]>();
  for (const id of nodeOrder) children.set(id, []);
  for (const e of edges) {
    const list = children.get(e.from);
    if (list && !list.includes(e.to)) list.push(e.to);
  }

  // BFS depth assignment
  const depth = new Map<string, number>();
  const inDeg = new Map<string, number>();
  for (const id of nodeOrder) inDeg.set(id, 0);
  for (const e of edges) inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1);

  const roots = nodeOrder.filter((id) => (inDeg.get(id) ?? 0) === 0);
  if (roots.length === 0) roots.push(nodeOrder[0]);

  const visited = new Set<string>();
  const queue: string[] = [];
  for (const r of roots) { depth.set(r, 0); queue.push(r); visited.add(r); }

  while (queue.length > 0) {
    const node = queue.shift()!;
    const d = depth.get(node)!;
    for (const child of children.get(node) ?? []) {
      if (!visited.has(child)) {
        visited.add(child);
        depth.set(child, d + 1);
        queue.push(child);
      }
    }
  }
  // Assign unvisited nodes
  for (const id of nodeOrder) {
    if (!depth.has(id)) depth.set(id, (depth.size > 0 ? Math.max(...depth.values()) + 1 : 0));
  }

  // Group by level
  const levels = new Map<number, string[]>();
  for (const [id, d] of depth) {
    if (!levels.has(d)) levels.set(d, []);
    levels.get(d)!.push(id);
  }

  // Position nodes: center each level horizontally
  const nodePos = new Map<string, { x: number; y: number }>();
  const sortedLvls = [...levels.entries()].sort((a, b) => a[0] - b[0]);
  const maxWidth = Math.max(...sortedLvls.map(([, ids]) => ids.length));

  for (const [lvl, ids] of sortedLvls) {
    const totalW = ids.length * NODE_W + (ids.length - 1) * H_GAP;
    const maxTotalW = maxWidth * NODE_W + (maxWidth - 1) * H_GAP;
    const offsetX = startX + (maxTotalW - totalW) / 2;
    for (let i = 0; i < ids.length; i++) {
      nodePos.set(ids[i], {
        x: offsetX + i * (NODE_W + H_GAP),
        y: startY + lvl * (NODE_H + V_GAP),
      });
    }
  }

  // Color palette by depth
  const colors = ["#a5d8ff", "#b2f2bb", "#ffec99", "#d0bfff", "#ffc9c9", "#dee2e6"];

  for (const id of nodeOrder) {
    const pos = nodePos.get(id);
    if (!pos) continue;
    const label = nodeLabels.get(id) ?? id;
    const shape = nodeShapes.get(id) ?? "rectangle";
    const d = depth.get(id) ?? 0;

    elements.push(createElement({
      type: shape,
      x: pos.x,
      y: pos.y,
      width: NODE_W,
      height: NODE_H,
      backgroundColor: colors[d % colors.length],
    }));
    elements.push(createElement({
      type: "text",
      x: pos.x + 15,
      y: pos.y + NODE_H / 2 - 10,
      width: NODE_W - 30,
      height: 24,
      text: label,
      fontSize: 14,
    }));
  }

  // Arrows: connect from bottom-center to top-center, offset if side-by-side
  for (const e of edges) {
    const from = nodePos.get(e.from);
    const to = nodePos.get(e.to);
    if (!from || !to) continue;

    const fromCx = from.x + NODE_W / 2;
    const fromBot = from.y + NODE_H;
    const toCx = to.x + NODE_W / 2;
    const toTop = to.y;

    // For back-edges (to a node above or same row), route around the right
    if (toTop <= from.y) {
      // Find the rightmost x of all nodes to route outside
      const maxRight = Math.max(...[...nodePos.values()].map((p) => p.x + NODE_W));
      const routeX = maxRight + 60; // Route outside all nodes

      const fx = from.x + NODE_W;
      const fy = from.y + NODE_H / 2;
      const tx = to.x + NODE_W;
      const ty = to.y + NODE_H / 2;
      const offsetR = routeX - fx;

      elements.push(createElement({
        type: "arrow",
        x: fx, y: fy,
        width: tx - fx, height: ty - fy,
        points: [[0, 0], [offsetR, 0], [offsetR, ty - fy], [tx - fx, ty - fy]],
        strokeColor: "#868e96",
      }));
    } else {
      elements.push(createElement({
        type: "arrow",
        x: fromCx, y: fromBot,
        width: toCx - fromCx, height: toTop - fromBot,
        points: [[0, 0], [toCx - fromCx, toTop - fromBot]],
      }));
    }

    if (e.label) {
      const midX = (fromCx + toCx) / 2 + 15;
      const midY = (fromBot + toTop) / 2 - 8;
      elements.push(createElement({
        type: "text",
        x: midX, y: midY,
        width: e.label.length * 8 + 10,
        height: 20,
        text: e.label,
        fontSize: 12,
        strokeColor: "#868e96",
      }));
    }
  }

  return elements;
}

async function handleToolCall(
  ctx: {
    runMutation: (ref: unknown, args: unknown) => Promise<unknown>;
    runQuery: (ref: unknown, args: unknown) => Promise<unknown>;
  },
  toolName: string,
  args: Record<string, unknown>,
  siteUrl: string,
) {
  switch (toolName) {
    case "create_board": {
      const result = (await ctx.runMutation(api.boards.create, {
        title: (args.title as string) ?? "Untitled Board",
      })) as { boardId: string; secret: string };
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                board_id: result.boardId,
                secret: result.secret,
                url: `${siteUrl}/board/${result.boardId}`,
                message:
                  "Board created successfully. Save the secret - you need it for all write operations. Share the URL for live viewing.",
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    case "get_board": {
      const boardId = args.board_id as string;
      try {
        const board = await ctx.runQuery(api.boards.get, {
          id: boardId as Id<"boards">,
        });
        if (!board) {
          return {
            content: [{ type: "text", text: "Board not found." }],
            isError: true,
          };
        }
        const elements = JSON.parse(
          (board as { elements: string }).elements,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  board_id: boardId,
                  title: (board as { title: string }).title,
                  element_count: elements.length,
                  elements: elements.map(
                    (el: Record<string, unknown>) => ({
                      id: el.id,
                      type: el.type,
                      x: el.x,
                      y: el.y,
                      width: el.width,
                      height: el.height,
                      text: el.text || undefined,
                    }),
                  ),
                  url: `${siteUrl}/board/${boardId}`,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch {
        return {
          content: [
            { type: "text", text: `Board not found: ${boardId}` },
          ],
          isError: true,
        };
      }
    }

    case "add_elements": {
      const boardId = args.board_id as string;
      const secret = args.secret as string;
      if (!secret) {
        return {
          content: [
            { type: "text", text: "Missing required parameter: secret" },
          ],
          isError: true,
        };
      }
      try {
        const board = await ctx.runQuery(api.boards.get, {
          id: boardId as Id<"boards">,
        });
        if (!board) {
          return {
            content: [{ type: "text", text: "Board not found." }],
            isError: true,
          };
        }

        const parsed = JSON.parse(
          (board as { elements: string }).elements,
        );
        // If it's a tldraw snapshot (object with 'store'), start fresh
        const existingElements = Array.isArray(parsed) ? parsed : [];
        const newElements: Record<string, unknown>[] = [];

        if (args.elements && Array.isArray(args.elements)) {
          for (const el of args.elements) {
            newElements.push(
              createElement(el as Record<string, unknown>),
            );
          }
        }

        if (args.mermaid && typeof args.mermaid === "string") {
          const maxY =
            existingElements.length > 0
              ? Math.max(
                  ...existingElements.map(
                    (el: Record<string, unknown>) =>
                      ((el.y as number) ?? 0) +
                      ((el.height as number) ?? 0),
                  ),
                ) + 50
              : 100;
          const mermaidElements = parseMermaidToElements(
            args.mermaid,
            100,
            maxY,
          );
          newElements.push(...mermaidElements);
        }

        const allElements = [...existingElements, ...newElements];
        await ctx.runMutation(api.boards.update, {
          id: boardId as Id<"boards">,
          elements: JSON.stringify(allElements),
          secret,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  added: newElements.length,
                  total: allElements.length,
                  added_ids: newElements.map(
                    (el) => el.id as string,
                  ),
                  url: `${siteUrl}/board/${boardId}`,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: `Error adding elements: ${e instanceof Error ? e.message : String(e)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "clear_board": {
      const boardId = args.board_id as string;
      const secret = args.secret as string;
      if (!secret) {
        return {
          content: [
            { type: "text", text: "Missing required parameter: secret" },
          ],
          isError: true,
        };
      }
      try {
        await ctx.runMutation(api.boards.update, {
          id: boardId as Id<"boards">,
          elements: "[]",
          secret,
        });
        return {
          content: [
            {
              type: "text",
              text: "Board cleared successfully.",
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${e instanceof Error ? e.message : String(e)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "update_element": {
      const boardId = args.board_id as string;
      const secret = args.secret as string;
      if (!secret) {
        return {
          content: [
            { type: "text", text: "Missing required parameter: secret" },
          ],
          isError: true,
        };
      }
      const elementId = args.element_id as string;
      const updates = args.updates as Record<string, unknown>;
      try {
        const board = await ctx.runQuery(api.boards.get, {
          id: boardId as Id<"boards">,
        });
        if (!board) {
          return {
            content: [{ type: "text", text: "Board not found." }],
            isError: true,
          };
        }

        const elements = JSON.parse(
          (board as { elements: string }).elements,
        ) as Record<string, unknown>[];
        const idx = elements.findIndex((el) => el.id === elementId);
        if (idx === -1) {
          return {
            content: [
              { type: "text", text: `Element not found: ${elementId}` },
            ],
            isError: true,
          };
        }

        elements[idx] = {
          ...elements[idx],
          ...updates,
        };

        await ctx.runMutation(api.boards.update, {
          id: boardId as Id<"boards">,
          elements: JSON.stringify(elements),
          secret,
        });

        return {
          content: [
            {
              type: "text",
              text: `Element ${elementId} updated successfully.`,
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${e instanceof Error ? e.message : String(e)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "delete_elements": {
      const boardId = args.board_id as string;
      const secret = args.secret as string;
      if (!secret) {
        return {
          content: [
            { type: "text", text: "Missing required parameter: secret" },
          ],
          isError: true,
        };
      }
      const elementIds = args.element_ids as string[];
      try {
        const board = await ctx.runQuery(api.boards.get, {
          id: boardId as Id<"boards">,
        });
        if (!board) {
          return {
            content: [{ type: "text", text: "Board not found." }],
            isError: true,
          };
        }

        const elements = JSON.parse(
          (board as { elements: string }).elements,
        ) as Record<string, unknown>[];
        const idSet = new Set(elementIds);
        const filtered = elements.filter(
          (el) => !idSet.has(el.id as string),
        );

        await ctx.runMutation(api.boards.update, {
          id: boardId as Id<"boards">,
          elements: JSON.stringify(filtered),
          secret,
        });

        return {
          content: [
            {
              type: "text",
              text: `Deleted ${elements.length - filtered.length} elements.`,
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${e instanceof Error ? e.message : String(e)}`,
            },
          ],
          isError: true,
        };
      }
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
        isError: true,
      };
  }
}

// MCP endpoint - Streamable HTTP transport
http.route({
  path: "/mcp",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const clientIp =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const rateLimitResult = (await ctx.runMutation(api.rateLimit.check, {
      key: clientIp,
    })) as { allowed: boolean; remaining: number };

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Rate limit exceeded. Try again in a minute.",
          },
          id: null,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          },
        },
      );
    }

    const body = await request.json();
    const { method, id, params } = body as {
      jsonrpc: string;
      method: string;
      id: unknown;
      params?: Record<string, unknown>;
    };

    const webUrl =
      process.env.SITE_URL ?? request.headers.get("origin") ?? "";

    let result: unknown;

    switch (method) {
      case "initialize":
        result = {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: {
            name: "QuickBoard",
            version: "1.0.0",
          },
        };
        break;

      case "notifications/initialized":
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS,
        });

      case "tools/list":
        result = { tools: MCP_TOOLS };
        break;

      case "tools/call": {
        const toolName = (params as { name: string }).name;
        const toolArgs =
          ((params as { arguments?: Record<string, unknown> })
            .arguments as Record<string, unknown>) ?? {};
        result = await handleToolCall(
          ctx as unknown as {
            runMutation: (
              ref: unknown,
              args: unknown,
            ) => Promise<unknown>;
            runQuery: (
              ref: unknown,
              args: unknown,
            ) => Promise<unknown>;
          },
          toolName,
          toolArgs,
          webUrl,
        );
        break;
      }

      case "ping":
        result = {};
        break;

      default:
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32601,
              message: `Method not found: ${method}`,
            },
            id,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          },
        );
    }

    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        result,
        id,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      },
    );
  }),
});

// CORS preflight
http.route({
  path: "/mcp",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }),
});

// Health check
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({ status: "ok", service: "quickboard-mcp" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      },
    );
  }),
});

export default http;

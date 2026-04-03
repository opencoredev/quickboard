import { api } from "@quickboard/backend/convex/_generated/api";
import type { Id } from "@quickboard/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Editor,
  type TLDefaultColorStyle,
  type TLStoreSnapshot,
  Tldraw,
  getSnapshot,
  loadSnapshot,
  toRichText,
} from "tldraw";

interface SimpleElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  strokeColor?: string;
  backgroundColor?: string;
  strokeWidth?: number;
  points?: number[][];
}

const COLOR_MAP: Record<string, string> = {
  "#1e1e1e": "black",
  "#e03131": "red",
  "#2f9e44": "green",
  "#1971c2": "blue",
  "#f08c00": "orange",
  "#6741d9": "violet",
  "#339af0": "blue",
  "#fa5252": "red",
  "#40c057": "green",
  "#fab005": "yellow",
  "#495057": "grey",
  "#868e96": "grey",
};

function closestColor(hex: string): TLDefaultColorStyle {
  if (!hex || hex === "transparent") return "black";
  return (COLOR_MAP[hex.toLowerCase()] ?? "black") as TLDefaultColorStyle;
}

function closestFillColor(hex: string): TLDefaultColorStyle {
  if (!hex || hex === "transparent") return "blue";
  const h = hex.toLowerCase();
  if (h.includes("d8ff") || h.includes("a5d8")) return "blue";
  if (h.includes("f2bb") || h.includes("b2f2")) return "green";
  if (h.includes("ec99") || h.includes("ffec")) return "yellow";
  if (h.includes("c9c9") || h.includes("ffc9")) return "red";
  if (h.includes("bfff") || h.includes("d0bf")) return "violet";
  if (h.includes("dee2") || h.includes("f8f9")) return "grey";
  return (COLOR_MAP[h] ?? "blue") as TLDefaultColorStyle;
}

function convertSimpleToTldrawShapes(editor: Editor, elements: SimpleElement[]) {
  const shapes: Parameters<Editor["createShapes"]>[0] = [];

  for (const el of elements) {
    const baseColor = closestColor(el.strokeColor ?? "#1e1e1e");
    const fillColor = closestFillColor(el.backgroundColor ?? "transparent");
    const hasFill = el.backgroundColor && el.backgroundColor !== "transparent";

    switch (el.type) {
      case "rectangle":
      case "ellipse":
      case "diamond": {
        const geoMap: Record<string, string> = {
          rectangle: "rectangle",
          ellipse: "ellipse",
          diamond: "diamond",
        };
        shapes.push({
          type: "geo",
          x: el.x,
          y: el.y,
          props: {
            geo: geoMap[el.type] as "rectangle" | "ellipse" | "diamond",
            w: el.width ?? 100,
            h: el.height ?? 100,
            color: hasFill ? fillColor : baseColor,
            fill: hasFill ? "solid" : "none",
            size: "m",
          },
        });
        break;
      }

      case "text": {
        shapes.push({
          type: "text",
          x: el.x,
          y: el.y,
          props: {
            richText: toRichText(el.text ?? ""),
            color: baseColor,
            size: (el.fontSize ?? 20) > 24 ? "l" : (el.fontSize ?? 20) > 16 ? "m" : "s",
          },
        });
        break;
      }

      case "arrow": {
        const pts = el.points ?? [[0, 0], [el.width ?? 100, el.height ?? 0]];
        const endPt = pts[pts.length - 1] ?? [100, 0];
        shapes.push({
          type: "arrow",
          x: el.x,
          y: el.y,
          props: {
            start: { x: 0, y: 0 },
            end: { x: endPt[0] ?? 100, y: endPt[1] ?? 0 },
            color: baseColor,
            size: "m",
          },
        });
        break;
      }

      case "line": {
        const linePts = el.points ?? [[0, 0], [el.width ?? 100, el.height ?? 0]];
        const lineEnd = linePts[linePts.length - 1] ?? [100, 0];
        // Use arrow without arrowhead for lines
        shapes.push({
          type: "arrow",
          x: el.x,
          y: el.y,
          props: {
            start: { x: 0, y: 0 },
            end: { x: lineEnd[0] ?? 100, y: lineEnd[1] ?? 0 },
            color: baseColor,
            size: "m",
            arrowheadEnd: "none",
          },
        });
        break;
      }
    }
  }

  if (shapes.length > 0) {
    editor.createShapes(shapes);
  }
}

interface TldrawCanvasProps {
  boardId: Id<"boards">;
}

export function TldrawCanvas({ boardId }: TldrawCanvasProps) {
  const board = useQuery(api.boards.get, { id: boardId });
  const updateBoard = useMutation(api.boards.update);

  const [ready, setReady] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedVersionRef = useRef(0);
  const pendingSaveRef = useRef(false);
  const editorRef = useRef<Editor | null>(null);
  const initializedRef = useRef(false);
  const boardDataRef = useRef<string>("[]");

  // Track board data for onMount
  useEffect(() => {
    if (board) {
      boardDataRef.current = board.elements;
      if (!initializedRef.current) {
        setReady(true);
      }
    }
  }, [board]);

  // Listen for remote changes (from MCP or other tabs)
  useEffect(() => {
    if (!board || !initializedRef.current || !editorRef.current) return;
    if (board.lastModified <= lastSavedVersionRef.current) return;
    if (pendingSaveRef.current) return;

    try {
      const parsed = JSON.parse(board.elements);
      if (parsed.store) {
        // tldraw snapshot - load it
        const store = editorRef.current.store;
        loadSnapshot(store, parsed as TLStoreSnapshot);
      } else if (Array.isArray(parsed) && parsed.length > 0) {
        // Simple elements from MCP - convert and add
        editorRef.current.selectAll().deleteShapes(editorRef.current.getSelectedShapeIds());
        convertSimpleToTldrawShapes(editorRef.current, parsed as SimpleElement[]);
      }
      lastSavedVersionRef.current = board.lastModified;
    } catch {
      // ignore
    }
  }, [board]);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
    initializedRef.current = true;

    // Load initial data
    try {
      const data = boardDataRef.current;
      if (data && data !== "[]") {
        const parsed = JSON.parse(data);
        if (parsed.store) {
          loadSnapshot(editor.store, parsed as TLStoreSnapshot);
        } else if (Array.isArray(parsed) && parsed.length > 0) {
          convertSimpleToTldrawShapes(editor, parsed as SimpleElement[]);
          // Save as tldraw snapshot for future loads
          setTimeout(async () => {
            const snapshot = getSnapshot(editor.store);
            pendingSaveRef.current = true;
            try {
              await updateBoard({
                id: boardId,
                elements: JSON.stringify(snapshot),
              });
              lastSavedVersionRef.current = Date.now();
            } finally {
              pendingSaveRef.current = false;
            }
          }, 500);
        }
      }
    } catch {
      // ignore
    }

    if (board) {
      lastSavedVersionRef.current = board.lastModified;
    }

    // Listen for changes and save to Convex
    const cleanup = editor.store.listen(() => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      pendingSaveRef.current = true;

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const snapshot = getSnapshot(editor.store);
          await updateBoard({
            id: boardId,
            elements: JSON.stringify(snapshot),
          });
          lastSavedVersionRef.current = Date.now();
        } finally {
          pendingSaveRef.current = false;
        }
      }, 300);
    });

    return () => {
      cleanup();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [boardId, updateBoard, board]);

  if (!board || !ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading board...</span>
        </div>
      </div>
    );
  }

  return <Tldraw onMount={handleMount} />;
}

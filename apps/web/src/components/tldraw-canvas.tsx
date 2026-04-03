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
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  strokeColor?: string;
  backgroundColor?: string;
  points?: number[][];
}

const COLOR_MAP: Record<string, TLDefaultColorStyle> = {
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

function mapColor(hex?: string): TLDefaultColorStyle {
  if (!hex || hex === "transparent") return "black";
  return COLOR_MAP[hex.toLowerCase()] ?? "black";
}

function mapFillColor(hex?: string): TLDefaultColorStyle {
  if (!hex || hex === "transparent") return "blue";
  const h = hex.toLowerCase();
  if (h.includes("d8ff") || h.includes("a5d8")) return "blue";
  if (h.includes("f2bb") || h.includes("b2f2")) return "green";
  if (h.includes("ec99") || h.includes("ffec")) return "yellow";
  if (h.includes("c9c9") || h.includes("ffc9")) return "red";
  if (h.includes("bfff") || h.includes("d0bf")) return "violet";
  return COLOR_MAP[h] ?? "blue";
}

function convertSimpleToTldraw(editor: Editor, elements: SimpleElement[]) {
  const shapes: Parameters<Editor["createShapes"]>[0] = [];

  for (const el of elements) {
    const color = mapColor(el.strokeColor);
    const hasFill = el.backgroundColor && el.backgroundColor !== "transparent";

    if (el.type === "rectangle" || el.type === "ellipse" || el.type === "diamond") {
      shapes.push({
        type: "geo",
        x: el.x,
        y: el.y,
        props: {
          geo: el.type as "rectangle" | "ellipse" | "diamond",
          w: el.width ?? 100,
          h: el.height ?? 100,
          color: hasFill ? mapFillColor(el.backgroundColor) : color,
          fill: hasFill ? "solid" : "none",
          size: "m",
        },
      });
    } else if (el.type === "text") {
      shapes.push({
        type: "text",
        x: el.x,
        y: el.y,
        props: {
          richText: toRichText(el.text ?? ""),
          color,
          size: (el.fontSize ?? 20) > 24 ? "l" : (el.fontSize ?? 20) > 16 ? "m" : "s",
        },
      });
    } else if (el.type === "arrow" || el.type === "line") {
      const pts = el.points ?? [[0, 0], [el.width ?? 100, el.height ?? 0]];
      const end = pts[pts.length - 1] ?? [100, 0];
      shapes.push({
        type: "arrow",
        x: el.x,
        y: el.y,
        props: {
          start: { x: 0, y: 0 },
          end: { x: end[0] ?? 100, y: end[1] ?? 0 },
          color,
          size: "m",
          ...(el.type === "line" ? { arrowheadEnd: "none" as const } : {}),
        },
      });
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
  const editorRef = useRef<Editor | null>(null);
  const initializedRef = useRef(false);
  const boardDataRef = useRef<string>("[]");
  const suppressSaveRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedHashRef = useRef("");

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

    const remoteData = board.elements;

    // Skip if this is data we just saved
    if (remoteData === lastSavedHashRef.current) return;

    try {
      const parsed = JSON.parse(remoteData);
      suppressSaveRef.current = true;

      if (parsed.store) {
        loadSnapshot(editorRef.current.store, parsed as TLStoreSnapshot);
      } else if (Array.isArray(parsed) && parsed.length > 0) {
        // Clear and recreate from simple elements
        const ids = editorRef.current.getCurrentPageShapeIds();
        if (ids.size > 0) {
          editorRef.current.deleteShapes([...ids]);
        }
        convertSimpleToTldraw(editorRef.current, parsed as SimpleElement[]);
      }

      lastSavedHashRef.current = remoteData;

      // Allow save listener to fire again after a tick
      requestAnimationFrame(() => {
        suppressSaveRef.current = false;
      });
    } catch {
      suppressSaveRef.current = false;
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
        suppressSaveRef.current = true;

        if (parsed.store) {
          loadSnapshot(editor.store, parsed as TLStoreSnapshot);
        } else if (Array.isArray(parsed) && parsed.length > 0) {
          convertSimpleToTldraw(editor, parsed as SimpleElement[]);
        }

        // Save as tldraw snapshot so future loads are fast
        const snapshot = getSnapshot(editor.store);
        const snapshotStr = JSON.stringify(snapshot);
        lastSavedHashRef.current = snapshotStr;

        updateBoard({
          id: boardId,
          elements: snapshotStr,
        }).then(() => {
          suppressSaveRef.current = false;
        });
      } else {
        suppressSaveRef.current = false;
      }
    } catch {
      suppressSaveRef.current = false;
    }

    // Listen for user edits and save to Convex
    const cleanup = editor.store.listen(() => {
      if (suppressSaveRef.current) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        if (suppressSaveRef.current) return;
        const snapshot = getSnapshot(editor.store);
        const snapshotStr = JSON.stringify(snapshot);
        lastSavedHashRef.current = snapshotStr;
        await updateBoard({
          id: boardId,
          elements: snapshotStr,
        });
      }, 500);
    });

    return () => {
      cleanup();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [boardId, updateBoard]);

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

import { api } from "@quickboard/backend/convex/_generated/api";
import type { Id } from "@quickboard/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Editor,
  Tldraw,
  createTLStore,
  getSnapshot,
  loadSnapshot,
} from "tldraw";

const TLDRAW_CSS = "https://esm.sh/tldraw@3.15.6/tldraw.css";

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

type TldrawColor = "black" | "red" | "green" | "blue" | "orange" | "violet" | "yellow" | "grey" | "light-blue" | "light-green" | "light-red" | "light-violet" | "white";

const COLOR_MAP: Record<string, TldrawColor> = {
  "#1e1e1e": "black", "#e03131": "red", "#2f9e44": "green",
  "#1971c2": "blue", "#f08c00": "orange", "#6741d9": "violet",
  "#339af0": "blue", "#fa5252": "red", "#40c057": "green",
  "#fab005": "yellow", "#495057": "grey", "#868e96": "grey",
};

function mapColor(hex?: string): TldrawColor {
  if (!hex || hex === "transparent") return "black";
  return COLOR_MAP[hex.toLowerCase()] ?? "black";
}

function mapFillColor(hex?: string): TldrawColor {
  if (!hex || hex === "transparent") return "blue";
  const h = hex.toLowerCase();
  if (h.includes("d8ff") || h.includes("a5d8")) return "light-blue";
  if (h.includes("f2bb") || h.includes("b2f2")) return "light-green";
  if (h.includes("ec99") || h.includes("ffec")) return "yellow";
  if (h.includes("c9c9") || h.includes("ffc9")) return "light-red";
  if (h.includes("bfff") || h.includes("d0bf")) return "light-violet";
  if (h.includes("dee2") || h.includes("f8f9")) return "grey";
  return COLOR_MAP[h] ?? "blue";
}

function convertSimpleToTldraw(editor: Editor, elements: SimpleElement[]) {
  for (const el of elements) {
    const color = mapColor(el.strokeColor);
    const hasFill = el.backgroundColor && el.backgroundColor !== "transparent";

    if (el.type === "rectangle" || el.type === "ellipse" || el.type === "diamond") {
      editor.createShape({
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
      editor.createShape({
        type: "text",
        x: el.x,
        y: el.y,
        props: {
          text: el.text ?? "",
          color,
          size: (el.fontSize ?? 20) > 24 ? "l" : (el.fontSize ?? 20) > 16 ? "m" : "s",
        },
      });
    } else if (el.type === "arrow" || el.type === "line") {
      const pts = el.points ?? [[0, 0], [el.width ?? 100, el.height ?? 0]];
      const end = pts[pts.length - 1] ?? [100, 0];
      editor.createShape({
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
}

interface TldrawCanvasProps {
  boardId: Id<"boards">;
}

export function TldrawCanvas({ boardId }: TldrawCanvasProps) {
  const board = useQuery(api.boards.get, { id: boardId });
  const updateBoard = useMutation(api.boards.update);

  const [store] = useState(() => createTLStore());
  const [ready, setReady] = useState(false);
  const [cssLoaded, setCssLoaded] = useState(false);
  const editorRef = useRef<Editor | null>(null);
  const suppressSaveRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedHashRef = useRef("");
  const initialLoadDone = useRef(false);

  // Load tldraw CSS
  useEffect(() => {
    const existing = document.querySelector(`link[href="${TLDRAW_CSS}"]`);
    if (existing) {
      setCssLoaded(true);
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = TLDRAW_CSS;
    link.onload = () => setCssLoaded(true);
    document.head.appendChild(link);
  }, []);

  // Load initial data into store when board arrives
  useEffect(() => {
    if (!board || initialLoadDone.current) return;
    initialLoadDone.current = true;

    try {
      const data = board.elements;
      if (data && data !== "[]") {
        const parsed = JSON.parse(data);
        if (parsed.document || parsed.store) {
          suppressSaveRef.current = true;
          loadSnapshot(store, parsed);
          lastSavedHashRef.current = data;
          suppressSaveRef.current = false;
        }
        // Simple elements will be converted in onMount
      }
    } catch {
      // ignore
    }

    setReady(true);
  }, [board, store]);

  // Listen for remote changes
  useEffect(() => {
    if (!board || !editorRef.current || !initialLoadDone.current) return;

    const remoteData = board.elements;
    if (remoteData === lastSavedHashRef.current) return;

    try {
      const parsed = JSON.parse(remoteData);
      suppressSaveRef.current = true;

      if (parsed.document || parsed.store) {
        loadSnapshot(store, parsed);
      } else if (Array.isArray(parsed) && parsed.length > 0) {
        const ids = editorRef.current.getCurrentPageShapeIds();
        if (ids.size > 0) editorRef.current.deleteShapes([...ids]);
        convertSimpleToTldraw(editorRef.current, parsed as SimpleElement[]);
      }

      lastSavedHashRef.current = remoteData;
      requestAnimationFrame(() => { suppressSaveRef.current = false; });
    } catch {
      suppressSaveRef.current = false;
    }
  }, [board, store]);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;

    // Convert simple elements if needed
    if (board) {
      try {
        const parsed = JSON.parse(board.elements);
        if (Array.isArray(parsed) && parsed.length > 0) {
          suppressSaveRef.current = true;
          convertSimpleToTldraw(editor, parsed as SimpleElement[]);

          // Save as tldraw snapshot
          setTimeout(() => {
            const snapshot = getSnapshot(store);
            const str = JSON.stringify(snapshot);
            lastSavedHashRef.current = str;
            updateBoard({ id: boardId, elements: str }).finally(() => {
              suppressSaveRef.current = false;
            });
          }, 300);
        }
      } catch {
        suppressSaveRef.current = false;
      }
    }

    // Save on changes
    const cleanup = store.listen(() => {
      if (suppressSaveRef.current) return;

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(() => {
        if (suppressSaveRef.current) return;
        const snapshot = getSnapshot(store);
        const str = JSON.stringify(snapshot);
        if (str === lastSavedHashRef.current) return;
        lastSavedHashRef.current = str;
        updateBoard({ id: boardId, elements: str });
      }, 500);
    });

    return () => {
      cleanup();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [boardId, updateBoard, board, store]);

  if (!board || !ready || !cssLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading board...</span>
        </div>
      </div>
    );
  }

  return <Tldraw store={store} onMount={handleMount} />;
}

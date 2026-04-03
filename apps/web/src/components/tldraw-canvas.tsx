import { api } from "@quickboard/backend/convex/_generated/api";
import type { Id } from "@quickboard/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  type Editor,
  type TLStoreSnapshot,
  Tldraw,
  createTLStore,
  getSnapshot,
  loadSnapshot,
} from "tldraw";

interface TldrawCanvasProps {
  boardId: Id<"boards">;
}

export function TldrawCanvas({ boardId }: TldrawCanvasProps) {
  const board = useQuery(api.boards.get, { id: boardId });
  const updateBoard = useMutation(api.boards.update);

  const store = useMemo(() => createTLStore(), []);
  const [ready, setReady] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedVersionRef = useRef(0);
  const pendingSaveRef = useRef(false);
  const editorRef = useRef<Editor | null>(null);

  // Load initial snapshot from Convex
  useLayoutEffect(() => {
    if (!board || ready) return;

    try {
      const elements = board.elements;
      if (elements && elements !== "[]") {
        const parsed = JSON.parse(elements);
        // Check if it's a tldraw snapshot (has 'store' key) or legacy format
        if (parsed.store) {
          loadSnapshot(store, parsed as TLStoreSnapshot);
        }
        // Legacy simple elements - we'll render them as empty canvas
        // (old boards from Excalidraw era just start fresh)
      }
    } catch {
      // ignore parse errors, start with empty canvas
    }

    lastSavedVersionRef.current = board.lastModified;
    setReady(true);
  }, [board, store, ready]);

  // Listen for remote changes (from MCP or other tabs)
  useEffect(() => {
    if (!board || !ready) return;
    if (board.lastModified <= lastSavedVersionRef.current) return;
    if (pendingSaveRef.current) return;

    try {
      const parsed = JSON.parse(board.elements);
      if (parsed.store) {
        loadSnapshot(store, parsed as TLStoreSnapshot);
      }
      lastSavedVersionRef.current = board.lastModified;
    } catch {
      // ignore
    }
  }, [board, ready, store]);

  // Save to Convex on store changes
  useEffect(() => {
    if (!ready) return;

    const cleanup = store.listen(() => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      pendingSaveRef.current = true;

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const snapshot = getSnapshot(store);
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
  }, [ready, store, boardId, updateBoard]);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading board...</span>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading canvas...</span>
        </div>
      </div>
    );
  }

  return (
    <Tldraw
      store={store}
      onMount={handleMount}
    />
  );
}

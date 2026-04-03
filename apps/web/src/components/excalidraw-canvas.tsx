import { api } from "@quickboard/backend/convex/_generated/api";
import type { Id } from "@quickboard/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ExcalidrawCanvasProps {
  boardId: Id<"boards">;
}

export function ExcalidrawCanvas({ boardId }: ExcalidrawCanvasProps) {
  const board = useQuery(api.boards.get, { id: boardId });
  const updateBoard = useMutation(api.boards.update);

  const [ExcalidrawComp, setExcalidrawComp] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const excalidrawRef = useRef<unknown>(null);
  const [initialized, setInitialized] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("[]");
  const isApplyingRemoteRef = useRef(false);
  const [isDark, setIsDark] = useState(true);

  // Load Excalidraw only on client side (CSS + JS)
  useEffect(() => {
    Promise.all([
      import("@excalidraw/excalidraw"),
      import("@excalidraw/excalidraw/index.css"),
    ]).then(([mod]) => {
      setExcalidrawComp(() => mod.Excalidraw as unknown as React.ComponentType<Record<string, unknown>>);
    });
  }, []);

  // Watch for theme changes
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Sync remote changes (from MCP or other users) into Excalidraw
  useEffect(() => {
    if (!board || !initialized || !excalidrawRef.current) return;

    const remoteElements = board.elements;

    // Skip if we already have this state
    if (remoteElements === lastSavedRef.current) return;

    // Remote state differs from what we last saved — apply it
    // Cancel any pending save to prevent overwriting
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    try {
      const parsed = JSON.parse(remoteElements);
      isApplyingRemoteRef.current = true;
      const excalidrawApi = excalidrawRef.current as {
        updateScene: (scene: { elements: unknown[] }) => void;
      };
      excalidrawApi.updateScene({ elements: parsed });
      lastSavedRef.current = remoteElements;
      // Allow a brief delay for the onChange triggered by updateScene to be ignored
      requestAnimationFrame(() => {
        isApplyingRemoteRef.current = false;
      });
    } catch {
      isApplyingRemoteRef.current = false;
    }
  }, [board, initialized]);

  const handleChange = useCallback(
    (elements: readonly unknown[]) => {
      if (!initialized) return;
      // Ignore changes triggered by applying remote updates
      if (isApplyingRemoteRef.current) return;

      const serialized = JSON.stringify(
        elements.filter(
          (el) => !(el as { isDeleted?: boolean }).isDeleted,
        ),
      );

      // No actual change from what we last saved
      if (serialized === lastSavedRef.current) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        // Re-capture current state at save time, not at onChange time
        const api = excalidrawRef.current as {
          getSceneElements: () => readonly unknown[];
        } | null;
        if (!api) return;

        const currentElements = api.getSceneElements();
        const toSave = JSON.stringify(
          currentElements.filter(
            (el) => !(el as { isDeleted?: boolean }).isDeleted,
          ),
        );

        lastSavedRef.current = toSave;
        await updateBoard({
          id: boardId,
          elements: toSave,
        });
      }, 800);
    },
    [boardId, updateBoard, initialized],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (!board || !ExcalidrawComp) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <span className="text-sm text-muted-foreground">
            {!board ? "Loading board..." : "Loading canvas..."}
          </span>
        </div>
      </div>
    );
  }

  const initialElements = JSON.parse(board.elements);

  return (
    <ExcalidrawComp
      excalidrawAPI={(excalidrawApi: unknown) => {
        excalidrawRef.current = excalidrawApi;
        lastSavedRef.current = board.elements;
        setInitialized(true);
      }}
      initialData={{
        elements: initialElements,
        appState: {
          viewBackgroundColor: "transparent",
          theme: isDark ? "dark" : "light",
        },
      }}
      onChange={handleChange}
      theme={isDark ? "dark" : "light"}
    />
  );
}

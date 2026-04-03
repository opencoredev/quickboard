import { api } from "@quickboard/backend/convex/_generated/api";
import type { Id } from "@quickboard/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

const EXCALIDRAW_CSS = "https://esm.sh/@excalidraw/excalidraw@0.18.0/dist/prod/index.css";

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
  const lastSavedVersionRef = useRef(0);
  const pendingSaveRef = useRef(false);
  const [isDark, setIsDark] = useState(true);

  // Load Excalidraw CSS via link tag (reliable across all environments)
  useEffect(() => {
    if (document.querySelector(`link[href="${EXCALIDRAW_CSS}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = EXCALIDRAW_CSS;
    document.head.appendChild(link);
  }, []);

  // Load Excalidraw JS component
  useEffect(() => {
    import("@excalidraw/excalidraw").then((mod) => {
      setExcalidrawComp(() => mod.Excalidraw as unknown as React.ComponentType<Record<string, unknown>>);
    });
  }, []);

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

  // Sync remote changes into Excalidraw
  useEffect(() => {
    if (!board || !initialized || !excalidrawRef.current) return;
    if (board.lastModified <= lastSavedVersionRef.current) return;
    if (pendingSaveRef.current) return;

    try {
      const parsed = JSON.parse(board.elements);
      const excalidrawApi = excalidrawRef.current as {
        getSceneElements: () => readonly unknown[];
        updateScene: (scene: { elements: unknown[] }) => void;
      };

      const localElements = excalidrawApi.getSceneElements();
      const remoteIds = new Set(parsed.map((el: { id: string }) => el.id));
      const localOnly = localElements.filter(
        (el) => !(el as { id: string; isDeleted?: boolean }).isDeleted &&
                !remoteIds.has((el as { id: string }).id),
      );

      excalidrawApi.updateScene({ elements: [...parsed, ...localOnly] });
      lastSavedVersionRef.current = board.lastModified;
    } catch {
      // ignore
    }
  }, [board, initialized]);

  const handleChange = useCallback(
    (_elements: readonly unknown[]) => {
      if (!initialized) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      pendingSaveRef.current = true;

      saveTimeoutRef.current = setTimeout(async () => {
        const excalidrawApi = excalidrawRef.current as {
          getSceneElements: () => readonly unknown[];
        } | null;
        if (!excalidrawApi) return;

        const currentElements = excalidrawApi.getSceneElements();
        const toSave = JSON.stringify(
          currentElements.filter(
            (el) => !(el as { isDeleted?: boolean }).isDeleted,
          ),
        );

        try {
          await updateBoard({
            id: boardId,
            elements: toSave,
          });
          lastSavedVersionRef.current = Date.now();
        } finally {
          pendingSaveRef.current = false;
        }
      }, 200);
    },
    [boardId, updateBoard, initialized],
  );

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
        lastSavedVersionRef.current = board.lastModified;
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

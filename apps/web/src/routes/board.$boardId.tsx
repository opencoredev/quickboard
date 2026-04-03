import { api } from "@quickboard/backend/convex/_generated/api";
import type { Id } from "@quickboard/backend/convex/_generated/dataModel";
import { Button } from "@quickboard/ui/components/button";
import { Input } from "@quickboard/ui/components/input";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  LayoutDashboard,
  Pencil,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ExcalidrawCanvas } from "../components/excalidraw-canvas";
import { ThemeToggle } from "../components/theme-toggle";

export const Route = createFileRoute("/board/$boardId")({
  component: BoardPage,
});

function BoardPage() {
  const { boardId } = Route.useParams();
  const board = useQuery(api.boards.get, {
    id: boardId as Id<"boards">,
  });
  const updateTitle = useMutation(api.boards.updateTitle);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (board) setTitle(board.title);
  }, [board]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveTitle = useCallback(async () => {
    if (title.trim() && title !== board?.title) {
      await updateTitle({
        id: boardId as Id<"boards">,
        title: title.trim(),
      });
    }
    setIsEditing(false);
  }, [title, board, boardId, updateTitle]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  if (board === undefined) {
    return (
      <div className="flex h-svh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (board === null) {
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-4">
        <LayoutDashboard className="h-12 w-12 text-muted-foreground/50" />
        <h1 className="text-xl font-semibold">Board not found</h1>
        <p className="text-sm text-muted-foreground">
          This board may have been deleted or expired.
        </p>
        <Link to="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-svh flex-col">
      <header className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {isEditing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveTitle();
              }}
              className="flex items-center gap-1"
            >
              <Input
                ref={inputRef}
                value={title}
                onChange={(e) =>
                  setTitle((e.target as HTMLInputElement).value)
                }
                onBlur={handleSaveTitle}
                className="h-7 w-48 text-sm"
              />
            </form>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors hover:bg-accent"
            >
              {board.title}
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {board.createdAt && (
            <span className="hidden items-center gap-1 text-[10px] text-muted-foreground/60 sm:flex">
              <Clock className="h-3 w-3" />
              Expires in {Math.max(1, Math.ceil((board.createdAt + 7 * 86400000 - Date.now()) / 86400000))}d
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="h-7 text-xs"
          >
            {copied ? (
              <>
                <Check className="mr-1 h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1 h-3 w-3" />
                Share
              </>
            )}
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <div className="relative flex-1">
        <ExcalidrawCanvas boardId={boardId as Id<"boards">} />
      </div>
    </div>
  );
}

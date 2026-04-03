import { api } from "@quickboard/backend/convex/_generated/api";
import { Button } from "@quickboard/ui/components/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  Clock,
  LayoutDashboard,
  Plus,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import Header from "../components/header";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const boards = useQuery(api.boards.list);
  const createBoard = useMutation(api.boards.create);
  const deleteBoard = useMutation(api.boards.remove);
  const navigate = useNavigate();

  const handleCreate = async () => {
    const id = await createBoard({ title: "Untitled Board" });
    navigate({ to: "/board/$boardId", params: { boardId: id } });
  };

  const handleDelete = async (
    e: React.MouseEvent,
    id: string,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    await deleteBoard({ id: id as never });
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered whiteboards via MCP
            </div>
            <h1 className="mb-3 text-4xl font-bold tracking-tight">
              QuickBoard
            </h1>
            <p className="mx-auto max-w-lg text-lg text-muted-foreground">
              Instant whiteboards that AI agents can draw on.
              Create a board, share the MCP endpoint, and watch your
              agent build diagrams in real-time.
            </p>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <Zap className="mb-2 h-5 w-5 text-chart-1" />
              <h3 className="text-sm font-medium">Instant</h3>
              <p className="text-xs text-muted-foreground">
                No sign-up. Create a board in one click.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <LayoutDashboard className="mb-2 h-5 w-5 text-chart-2" />
              <h3 className="text-sm font-medium">MCP Endpoint</h3>
              <p className="text-xs text-muted-foreground">
                One URL. Your agent draws, you watch live.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <Clock className="mb-2 h-5 w-5 text-chart-3" />
              <h3 className="text-sm font-medium">Auto-cleanup</h3>
              <p className="text-xs text-muted-foreground">
                Boards auto-delete after 3 days.
              </p>
            </div>
          </div>

          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Boards</h2>
            <Button onClick={handleCreate} size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              New Board
            </Button>
          </div>

          {!boards ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-xl border border-border bg-card"
                />
              ))}
            </div>
          ) : boards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <LayoutDashboard className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="mb-1 text-sm font-medium">No boards yet</p>
              <p className="mb-4 text-xs text-muted-foreground">
                Create your first board to get started
              </p>
              <Button onClick={handleCreate} size="sm" variant="outline">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create Board
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {boards.map((board) => {
                const elementCount = JSON.parse(board.elements).length;
                return (
                  <button
                    key={board._id}
                    onClick={() =>
                      navigate({
                        to: "/board/$boardId",
                        params: { boardId: board._id },
                      })
                    }
                    className="group relative rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-ring hover:shadow-md"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <h3 className="truncate text-sm font-medium pr-6">
                        {board.title}
                      </h3>
                      <button
                        onClick={(e) => handleDelete(e, board._id)}
                        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{elementCount} elements</span>
                      <span>{formatDate(board.lastModified)}</span>
                    </div>
                    <div className="mt-2 flex items-center text-xs text-chart-2 opacity-0 transition-opacity group-hover:opacity-100">
                      Open board
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

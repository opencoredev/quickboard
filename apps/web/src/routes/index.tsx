import { Button } from "@quickboard/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Clock,
  Copy,
  LayoutDashboard,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import Header from "../components/header";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

const MCP_URL = "https://courteous-rabbit-357.convex.site/mcp";

const SKILL_INSTALL = "npx skills add opencoredev/quickboard";

const SETUP_PROMPT = `Set up QuickBoard for me. Run these two commands:

1. Install the skill: ${SKILL_INSTALL}
2. Add the MCP: claude mcp add quickboard --transport http ${MCP_URL}

Then create a board and draw something to verify it works.`;

const CURSOR_CONFIG = `// 1. Install skill
npx skills add opencoredev/quickboard

// 2. Add to .cursor/mcp.json
{
  "mcpServers": {
    "quickboard": {
      "url": "${MCP_URL}"
    }
  }
}`;

const CLAUDE_CODE_CONFIG = `# Install skill + MCP in one go
npx skills add opencoredev/quickboard
claude mcp add quickboard --transport http ${MCP_URL}`;

const CODEX_CONFIG = `// 1. Install skill
npx skills add opencoredev/quickboard

// 2. Add to your MCP config
{
  "mcpServers": {
    "quickboard": {
      "url": "${MCP_URL}"
    }
  }
}`;

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-7 gap-1.5 text-xs text-muted-foreground"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {label}
        </>
      )}
    </Button>
  );
}

function RecentBoards() {
  const [boards, setBoards] = useState<{ id: string; title: string; ts: number }[]>([]);

  useEffect(() => {
    try {
      const visited = JSON.parse(localStorage.getItem("quickboard:visited") || "[]");
      setBoards(visited);
    } catch {}
  }, []);

  const removeBoard = useCallback((id: string) => {
    setBoards((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      localStorage.setItem("quickboard:visited", JSON.stringify(updated));
      return updated;
    });
  }, []);

  if (boards.length === 0) return null;

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="mb-12">
      <h2 className="mb-4 text-lg font-semibold">Recent Boards</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {boards.map((b) => (
          <div key={b.id} className="group flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:border-ring">
            <Link
              to="/board/$boardId"
              params={{ boardId: b.id }}
              className="flex-1 truncate"
            >
              <span className="text-sm font-medium">{b.title}</span>
              <span className="ml-2 text-xs text-muted-foreground">{formatTime(b.ts)}</span>
            </Link>
            <button
              onClick={() => removeBoard(b.id)}
              className="ml-2 rounded p-1 text-xs text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              x
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function HomeComponent() {
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleCopyPrompt = useCallback(() => {
    navigator.clipboard.writeText(SETUP_PROMPT);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  }, []);

  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16">
          {/* Hero */}
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered whiteboards via MCP
            </div>
            <h1 className="mb-4 text-5xl font-bold tracking-tight">
              QuickBoard
            </h1>
            <p className="mx-auto max-w-md text-base text-muted-foreground">
              Give your AI agent a whiteboard. One MCP endpoint, real-time
              canvas. Boards auto-delete after 7 days.
            </p>
          </div>

          {/* Quick setup prompt */}
          <div className="mb-12 rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Terminal className="h-5 w-5 text-chart-2" />
              <h2 className="text-lg font-semibold">Quick Setup</h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Paste this prompt into your AI agent and it will configure
              everything for you.
            </p>
            <div className="relative rounded-lg border border-border bg-background p-4">
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/80">
                {SETUP_PROMPT}
              </pre>
              <div className="mt-3 flex justify-end">
                <Button
                  onClick={handleCopyPrompt}
                  size="sm"
                  className="gap-1.5"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Prompt
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Manual setup guides */}
          <div className="mb-12">
            <h2 className="mb-6 text-lg font-semibold">Manual Setup</h2>
            <div className="space-y-4">
              {/* Claude Code */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-bold">
                      C
                    </div>
                    <h3 className="text-sm font-semibold">Claude Code</h3>
                  </div>
                  <CopyButton text={CLAUDE_CODE_CONFIG} label="Copy" />
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <code className="font-mono text-xs text-foreground/80">
                    {CLAUDE_CODE_CONFIG}
                  </code>
                </div>
              </div>

              {/* Cursor */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-bold">
                      {"{ }"}
                    </div>
                    <h3 className="text-sm font-semibold">Cursor</h3>
                  </div>
                  <CopyButton text={CURSOR_CONFIG} label="Copy" />
                </div>
                <p className="mb-2 text-xs text-muted-foreground">
                  Add to <code className="rounded bg-accent px-1 py-0.5 font-mono text-[11px]">.cursor/mcp.json</code>
                </p>
                <div className="rounded-lg border border-border bg-background p-3">
                  <pre className="font-mono text-xs text-foreground/80">
                    {CURSOR_CONFIG}
                  </pre>
                </div>
              </div>

              {/* Codex */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-bold">
                      {">>"}
                    </div>
                    <h3 className="text-sm font-semibold">Codex / Other</h3>
                  </div>
                  <CopyButton text={CODEX_CONFIG} label="Copy" />
                </div>
                <p className="mb-2 text-xs text-muted-foreground">
                  Add to your MCP config file
                </p>
                <div className="rounded-lg border border-border bg-background p-3">
                  <pre className="font-mono text-xs text-foreground/80">
                    {CODEX_CONFIG}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mb-12 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <Zap className="mb-2 h-5 w-5 text-chart-1" />
              <h3 className="text-sm font-medium">Real-time</h3>
              <p className="text-xs text-muted-foreground">
                Agent draws, you see it live. Cross-tab sync.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <LayoutDashboard className="mb-2 h-5 w-5 text-chart-2" />
              <h3 className="text-sm font-medium">Full Canvas</h3>
              <p className="text-xs text-muted-foreground">
                Shapes, text, arrows, freehand, mermaid diagrams.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <Clock className="mb-2 h-5 w-5 text-chart-3" />
              <h3 className="text-sm font-medium">Auto-cleanup</h3>
              <p className="text-xs text-muted-foreground">
                Boards auto-delete after 7 days.
              </p>
            </div>
          </div>

          {/* Recently visited boards */}
          <RecentBoards />

          {/* MCP Endpoint */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">MCP Endpoint</h3>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {MCP_URL}
                </p>
              </div>
              <CopyButton text={MCP_URL} label="Copy URL" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

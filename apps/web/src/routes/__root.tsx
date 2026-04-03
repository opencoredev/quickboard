import type { ConvexQueryClient } from "@convex-dev/react-query";
import { Toaster } from "@quickboard/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { ConvexProvider } from "convex/react";

import appCss from "../index.css?url";

export interface RouterAppContext {
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: "QuickBoard - Instant Whiteboards for AI Agents" },
      {
        name: "description",
        content:
          "Create shareable whiteboards that AI agents can draw on via MCP. No sign-up required.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Geist+Mono:wght@100..900&display=swap",
      },
    ],
  }),

  component: RootDocument,
});

function RootDocument() {
  const { convexQueryClient } = Route.useRouteContext();
  return (
    <ConvexProvider client={convexQueryClient.convexClient}>
      <html lang="en" className="dark" suppressHydrationWarning>
        <head>
          <HeadContent />
        </head>
        <body>
          <Outlet />
          <Toaster richColors />
          <Scripts />
        </body>
      </html>
    </ConvexProvider>
  );
}

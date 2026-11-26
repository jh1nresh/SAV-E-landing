const titles = {
  400: "Bad Request",
  404: "Not Found",
  405: "Method Not Allowed",
} as const;

export function publicProblem(
  status: keyof typeof titles,
  code: string,
  detail: string,
  hint: string,
  headers?: Record<string, string>,
) {
  return Response.json({ type: "about:blank", title: titles[status], status, code, detail, hint }, {
    status,
    headers: { ...headers, "Content-Type": "application/problem+json", "Cache-Control": "no-store" },
  });
}

export const publicPathPattern = /^\/(?:[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*)?$/;

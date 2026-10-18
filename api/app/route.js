export function GET() {
  return new Response("Trip Planner API", {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

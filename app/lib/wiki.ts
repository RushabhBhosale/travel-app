import { useQuery } from "@tanstack/react-query";
import { USER_AGENT } from "./config";

export type WikiSummary = { title: string; extract: string; image?: string; url?: string };

const headers = { "Api-User-Agent": USER_AGENT };

async function fetchSummary(title: string): Promise<WikiSummary | null> {
  const r = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    { headers }
  );
  if (!r.ok) return null;
  const j = await r.json();
  if (j.type === "disambiguation") return null;
  return {
    title: j.title,
    extract: j.extract || "",
    image: j.thumbnail?.source,
    url: j.content_urls?.mobile?.page,
  };
}

export function useWikiSummary(title?: string) {
  return useQuery({
    queryKey: ["wiki", title],
    queryFn: () => fetchSummary(title!),
    enabled: !!title,
    staleTime: Infinity,
  });
}

/** Best matching Wikipedia photo for a free-text place name. */
export async function findPhoto(query: string): Promise<string | undefined> {
  try {
    const url =
      "https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&generator=search" +
      `&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=960&origin=*`;
    const j = await fetch(url, { headers }).then((r) => r.json());
    return j?.query?.pages?.[0]?.thumbnail?.source;
  } catch {
    return undefined;
  }
}

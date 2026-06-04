// Edge Function: proxy Migu + Netease Music API requests
// Migu handles search + play URL, Netease kept as fallback

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "search";
  const keyword = url.searchParams.get("keyword") || "";
  const copyrightId = url.searchParams.get("copyrightId") || "";
  const contentId = url.searchParams.get("contentId") || "";
  const albumId = url.searchParams.get("albumId") || "";

  try {
    let result: unknown;

    if (action === "search" && keyword) {
      // Search via Migu Music API
      const searchUrl = `https://c.musicapp.migu.cn/v1.0/content/search_all.do?text=${encodeURIComponent(keyword)}&pageNo=1&pageSize=20&isCopyright=1&sort=1&searchSwitch=%7B%22song%22%3A1%2C%22album%22%3A0%2C%22singer%22%3A0%2C%22tagSong%22%3A1%2C%22mvSong%22%3A0%2C%22bestShow%22%3A1%7D`;
      const resp = await fetch(searchUrl, {
        headers: { "User-Agent": UA, "Referer": "https://m.music.migu.cn/" },
      });
      const data = await resp.json();
      const songs = (data?.songResultData?.result || []).map((s: Record<string, unknown>) => ({
        id: s.contentId,
        name: s.name,
        artist: (s.singers as Array<{name: string}>)?.[0]?.name || "未知歌手",
        album: (s.albums as Array<{name: string}>)?.[0]?.name || "",
        copyrightId: s.copyrightId,
        albumId: (s.albums as Array<{id: string}>)?.[0]?.id || "0",
      }));
      result = { songs };
    } else if (action === "play" && copyrightId && contentId) {
      // Get real playable URL from Migu
      const playUrl = `https://c.musicapp.migu.cn/MIGUM3.0/strategy/listen-url/v2.3?copyrightId=${copyrightId}&contentId=${contentId}&resourceType=2&albumId=${albumId || "0"}&netType=01&toneFlag=PQ`;
      const resp = await fetch(playUrl, {
        headers: { "channel": "0140210", "User-Agent": UA },
      });
      const data = await resp.json();
      result = { url: data?.data?.url || null };
    } else {
      return new Response(JSON.stringify({ error: "Missing params" }), { status: 400, headers: CORS });
    }

    return new Response(JSON.stringify(result), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Proxy failed", detail: String(err) }), {
      status: 500,
      headers: CORS,
    });
  }
});

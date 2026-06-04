// Edge Function: proxy Netease Music API requests to bypass CORS
// Deploy to Supabase: supabase functions deploy music-proxy --project-ref qudyifwqcdququqndomb

const NETEASE = "https://music.163.com/api";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "/search/get";
  const params = url.searchParams.get("params") || "";

  // Build the full Netease URL
  const targetUrl = `${NETEASE}${path}?${params}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://music.163.com/",
        "Accept": "application/json, text/plain, */*",
      },
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Proxy failed", detail: String(err) }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});

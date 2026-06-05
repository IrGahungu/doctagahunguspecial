import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request, { params }: { params: Promise<{ segments: string[] }> }) {
  const resolvedParams = await params;
  const segments = resolvedParams.segments || [];
  const path = segments.join("/");

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  let authHeader = request.headers.get("Authorization");

  // Fallback to Bearer token from cookies if the Authorization header is missing
  if (!authHeader && token) {
    // Sanitize token: 
    // 1. Handle potential URI encoding (dots becoming %2E)
    // 2. Remove surrounding quotes often added by cookie parsers
    const decodedToken = decodeURIComponent(token);
    const cleanToken = decodedToken.replace(/^"(.*)"$/, '$1');
    
    authHeader = `Bearer ${cleanToken}`;
  }

  // Forward to your Express auth-server
  const backendUrl = `${process.env.NEXT_PUBLIC_AUTH_SERVER_URL || 'http://localhost:3001'}/api/admin/stats/${path}`;
  
  console.log(`[Proxy Request] Target: GET ${backendUrl}`);
  console.log(`[Proxy Request] Auth Strategy: ${request.headers.get("Authorization") ? 'Forwarded Header' : 'Cookie Fallback'}`);
  console.log(`[Proxy Request] Token Preview: ${token ? token.substring(0, 15) + '...' : 'null'}`);

  try {
    const res = await fetch(backendUrl, {
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    const data = await res.json().catch(() => ({ error: "Non-JSON response from backend" }));

    if (!res.ok) {
      console.error(`[Proxy Response] Error ${res.status} from Backend`);
      console.error(`[Proxy Response] Body:`, JSON.stringify(data, null, 2));
      console.error(`[Proxy Header Sent] Authorization: ${authHeader ? authHeader.substring(0, 22) + '...' : 'none'}`);
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[Proxy Error]:", error);
    return NextResponse.json({ error: "Backend communication failed" }, { status: 500 });
  }
}

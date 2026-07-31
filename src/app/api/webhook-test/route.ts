import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return NextResponse.json({
    message: "Webhook endpoint is accessible",
    timestamp: new Date().toISOString(),
    method: "GET",
    note: "This is a test endpoint. The actual MonCash webhook is at /api/webhooks/moncash (POST)"
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const headers = Object.fromEntries(request.headers.entries());

  console.log("[WEBHOOK_TEST] Received POST:", {
    body,
    headers: {
      "x-mcc-signature": headers["x-mcc-signature"],
      "x-mcc-timestamp": headers["x-mcc-timestamp"],
      "content-type": headers["content-type"]
    }
  });

  return NextResponse.json({
    message: "Webhook test endpoint received POST",
    timestamp: new Date().toISOString(),
    receivedBody: body,
    receivedHeaders: {
      signature: headers["x-mcc-signature"],
      timestamp: headers["x-mcc-timestamp"]
    }
  });
}

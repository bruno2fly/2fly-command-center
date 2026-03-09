/**
 * GET /api/clients/[id]/instagram/status
 * Returns Instagram connection status for the client.
 */

import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/instagram/store";
import { getClientInstagram } from "@/lib/client/mockSocialMediaData";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;

  const conn = await getConnection(clientId);

  if (conn) {
    return NextResponse.json({
      connected: true,
      username: conn.username,
    });
  }

  const fallbackHandle = getClientInstagram(clientId);
  return NextResponse.json({
    connected: false,
    username: fallbackHandle,
    message: fallbackHandle
      ? "Using demo handle. Connect Instagram for real feed."
      : "No Instagram configured. Add handle in mockSocialMediaData or connect via OAuth.",
  });
}

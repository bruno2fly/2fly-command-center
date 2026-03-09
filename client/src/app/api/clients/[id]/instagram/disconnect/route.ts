/**
 * POST /api/clients/[id]/instagram/disconnect
 * Disconnects Instagram for the client.
 */

import { NextRequest, NextResponse } from "next/server";
import { deleteConnection } from "@/lib/instagram/store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;

  await deleteConnection(clientId);

  return NextResponse.json({ success: true });
}

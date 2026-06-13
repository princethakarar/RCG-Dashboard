import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { list } from '@vercel/blob';

export const dynamic = 'force-dynamic';

export async function GET() {
  noStore();
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  const result: Record<string, unknown> = {
    tokenPresent: !!token,
    tokenPrefix: token ? token.substring(0, 30) + '...' : null,
  };

  try {
    const { blobs } = await list({ prefix: 'data/', token });
    result.blobCount = blobs.length;
    result.blobs = blobs.map((b) => ({
      pathname: b.pathname,
      size: b.size,
      url: b.url?.substring(0, 60) + '...',
    }));
  } catch (err: unknown) {
    result.listError = (err as Error).message;
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

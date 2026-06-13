import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file extension
    if (!file.name.endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Only .xlsx files are allowed' }, { status: 400 });
    }

    // Upload to Vercel Blob under a 'data/' prefix (private store)
    const blob = await put(`data/${file.name}`, file, {
      access: 'private',
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({ success: true, filename: file.name, url: blob.url });
  } catch (error: unknown) {
    console.error('Error in POST /api/upload:', error);
    return NextResponse.json({ error: (error as Error).message || 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Verify it is a Vercel Blob URL to prevent deleting arbitrary URLs
    if (!url.includes('.blob.vercel-storage.com/')) {
      return NextResponse.json({ error: 'Invalid blob URL' }, { status: 400 });
    }

    await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/upload:', error);
    return NextResponse.json({ error: (error as Error).message || 'Delete failed' }, { status: 500 });
  }
}

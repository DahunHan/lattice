import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    scanPath: process.env.HAILMARY_SCAN_PATH ?? null,
  });
}

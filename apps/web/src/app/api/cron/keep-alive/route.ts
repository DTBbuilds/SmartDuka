import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health/live`);
  } catch {
    // Swallow all errors - cron must never fail
  }
  return NextResponse.json({ ok: true });
}

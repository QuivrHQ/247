import { NextResponse } from 'next/server';
import { db, machines } from '@/lib/db';

export async function GET() {
  try {
    const allMachines = await db.select().from(machines);
    return NextResponse.json(allMachines);
  } catch (error) {
    console.error('[API] Failed to fetch machines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch machines', machines: [] },
      { status: 500 }
    );
  }
}

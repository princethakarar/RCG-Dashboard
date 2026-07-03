import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseNiftyWeeklyCsv } from '../../lib/niftyWeeklyCalculations';
import { computeNiftyMonthlyBenchmark } from '../../lib/niftyMonthlyCalculations';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'nifty50_weekly_data.csv');
    const csvText = fs.readFileSync(filePath, 'utf8');
    const rows = parseNiftyWeeklyCsv(csvText);
    const result = computeNiftyMonthlyBenchmark(rows);

    if (!result) {
      return NextResponse.json({ error: 'Insufficient weekly data to compute monthly benchmark' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[nifty-monthly] Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabase } from '../../../lib/supabase';
import redis, { invalidateCache, CACHE_KEYS } from '../../../lib/redis';

import { put } from '@vercel/blob';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;



export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const parsedDataStr = formData.get('parsedData') as string;

    if (!parsedDataStr) {
      return NextResponse.json({ error: 'Missing parsed data in request body' }, { status: 400 });
    }

    const { data3x, dataNet } = JSON.parse(parsedDataStr);

    if (!data3x || !dataNet) {
      return NextResponse.json({ error: 'Invalid parsed data in request body' }, { status: 400 });
    }

    // Optional backup to Vercel Blob if file is small enough
    if (file) {
      try {
        await put(`data/${file.name}`, file, {
          access: 'private',
          allowOverwrite: true,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        console.log(`[rcg-alpha-nav] Blob backup saved: ${file.name}`);
      } catch (blobErr) {
        console.error('[rcg-alpha-nav] Blob backup failed (non-critical):', blobErr);
      }
    }

    // Sanity check valid-rows count (should be more than 1)
    if (data3x.series.length <= 1 || dataNet.series.length <= 1) {
      console.warn(`[rcg-alpha-nav] Suspiciously low valid rows count. 3x count: ${data3x.series.length}, Net count: ${dataNet.series.length}`);
      return NextResponse.json({
        error: `No valid final NAV data points found in sheets (3x rows: ${data3x.series.length}, Net rows: ${dataNet.series.length}).`
      }, { status: 400 });
    }

    // ──────────────────────────────────────────
    // Supabase storage (Delete old rows first, then insert new)
    // ──────────────────────────────────────────
    console.log('[rcg-alpha-nav] Deleting old rows from Supabase...');
    // 1. Clear existing rows
    const [delSeriesRes, delForecastRes] = await Promise.all([
      supabase.from('nav_series').delete().neq('dashboard_type', 'none'),
      supabase.from('nav_forecast').delete().neq('dashboard_type', 'none'),
    ]);

    if (delSeriesRes.error) {
      console.error('[rcg-alpha-nav] Supabase series delete error:', delSeriesRes.error);
      throw new Error(`Database error (nav_series clear): ${delSeriesRes.error.message}`);
    }
    if (delForecastRes.error) {
      console.error('[rcg-alpha-nav] Supabase forecast delete error:', delForecastRes.error);
      throw new Error(`Database error (nav_forecast clear): ${delForecastRes.error.message}`);
    }

    // 2. Insert series rows
    const seriesRows = [
      ...data3x.series.map((s: { date: string, final_nav: number }) => ({ dashboard_type: '3x', date: s.date, final_nav: s.final_nav })),
      ...dataNet.series.map((s: { date: string, final_nav: number }) => ({ dashboard_type: 'net', date: s.date, final_nav: s.final_nav })),
    ];
    console.log(`[rcg-alpha-nav] Inserting ${seriesRows.length} series rows into Supabase...`);
    const { error: seriesError } = await supabase
      .from('nav_series')
      .insert(seriesRows);

    if (seriesError) {
      console.error('[rcg-alpha-nav] Supabase series insert error:', seriesError);
      throw new Error(`Database error (nav_series insert): ${seriesError.message}`);
    }

    // 3. Insert forecast rows
    console.log(`[rcg-alpha-nav] Inserting forecast rows into Supabase...`);
    const forecastRows = [
      { dashboard_type: '3x', annualized_forecast: data3x.forecast, updated_at: new Date().toISOString() },
      { dashboard_type: 'net', annualized_forecast: dataNet.forecast, updated_at: new Date().toISOString() },
    ];

    const { error: forecastError } = await supabase
      .from('nav_forecast')
      .insert(forecastRows);

    if (forecastError) {
      console.error('[rcg-alpha-nav] Supabase forecast insert error:', forecastError);
      throw new Error(`Database error (nav_forecast insert): ${forecastError.message}`);
    }

    // ──────────────────────────────────────────
    // Upstash Redis Caching
    // ──────────────────────────────────────────
    console.log('[rcg-alpha-nav] Writing to Redis cache...');
    const sorted3xSeries = [...data3x.series].sort((a, b) => a.date.localeCompare(b.date));
    const sortedNetSeries = [...dataNet.series].sort((a, b) => a.date.localeCompare(b.date));

    // Save directly to Redis
    try {
      await Promise.all([
        redis.set('nav:3x:series', sorted3xSeries),
        redis.set('nav:net:series', sortedNetSeries),
        redis.set('nav:3x:forecast', String(data3x.forecast)),
        redis.set('nav:net:forecast', String(dataNet.forecast)),
      ]);

      // Invalidate the main dashboard forecast cache so it updates
      await invalidateCache(CACHE_KEYS.DASHBOARD_FORECAST);
      console.log('[rcg-alpha-nav] Redis cache updated successfully.');
    } catch (redisError) {
      console.error('[rcg-alpha-nav] Non-critical cache write failure:', redisError);
      // Cache failure shouldn't block the user from seeing a success message, data is in Supabase
    }

    console.log('[rcg-alpha-nav] Revalidating paths and finishing upload.');
    revalidatePath('/api/portfolio-data');

    return NextResponse.json({
      success: true,
      message: 'RCG Alpha NAV data updated successfully',
      rowsUpserted: {
        '3x': data3x.series.length,
        'net': dataNet.series.length,
      },
      forecasts: {
        '3x': data3x.forecast,
        'net': dataNet.forecast,
      }
    });

  } catch (error: unknown) {
    console.error('Error in POST /api/upload/rcg-alpha-nav:', error);
    
    const msg = (error as Error).message || '';
    let userMessage = 'Something went wrong while uploading this file. Please try again or contact support.';
    
    if (msg.includes('Database error')) {
      userMessage = 'We couldn\'t save this data right now. Please try again in a moment.';
    } else if (msg.includes('fetch failed') || msg.includes('timeout')) {
      userMessage = 'The upload took too long to process. Please try again.';
    }

    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    // 1. Delete all rows from nav_series and nav_forecast in Supabase
    const [resSeries, resForecast] = await Promise.all([
      supabase.from('nav_series').delete().neq('dashboard_type', 'none'), // Deletes all rows since none is not a type
      supabase.from('nav_forecast').delete().neq('dashboard_type', 'none'),
    ]);

    if (resSeries.error) {
      throw new Error(`Database error (nav_series delete): ${resSeries.error.message}`);
    }
    if (resForecast.error) {
      throw new Error(`Database error (nav_forecast delete): ${resForecast.error.message}`);
    }

    // 2. Invalidate/Delete from Redis
    await Promise.all([
      redis.del('nav:3x:series'),
      redis.del('nav:net:series'),
      redis.del('nav:3x:forecast'),
      redis.del('nav:net:forecast'),
      invalidateCache(CACHE_KEYS.DASHBOARD_FORECAST),
    ]);

    revalidatePath('/api/portfolio-data');

    return NextResponse.json({
      success: true,
      message: 'RCG Alpha NAV data deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/upload/rcg-alpha-nav:', error);
    return NextResponse.json({ error: (error as Error).message || 'Delete failed' }, { status: 500 });
  }
}

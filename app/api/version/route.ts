import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const versionFilePath = path.join(process.cwd(), 'version.json');
    const versionDataStr = fs.readFileSync(versionFilePath, 'utf8');
    const versionData = JSON.parse(versionDataStr);
    
    const version = `${versionData.major}.${versionData.minor}.${versionData.patch}`;
    
    return new NextResponse(
      JSON.stringify({ version }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Error reading version file:', error);
    // Fallback to reading the env variable if file reading fails
    const version = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0';
    return new NextResponse(
      JSON.stringify({ version }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }
}

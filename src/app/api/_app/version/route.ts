import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    version: process.env.npm_package_version || '0.1.0',
    buildTime: new Date().toISOString(),
    nodeVersion: process.version,
    nextVersion: '15.3.5'
  });
}

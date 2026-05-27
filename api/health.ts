import { NextResponse } from 'next/server'
import { sql } from './lib/db'

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  })
}
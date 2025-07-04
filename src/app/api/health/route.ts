import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    // Check if critical environment variables are set
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY
    
    // Basic health check response
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      checks: {
        openai: hasOpenAIKey ? 'configured' : 'missing',
      }
    }

    // Return 503 if critical services are not configured
    if (!hasOpenAIKey) {
      return NextResponse.json(
        { ...health, status: 'unhealthy', error: 'Missing required configuration' },
        { status: 503 }
      )
    }

    return NextResponse.json(health, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        timestamp: new Date().toISOString(),
        error: 'Health check failed' 
      },
      { status: 500 }
    )
  }
}
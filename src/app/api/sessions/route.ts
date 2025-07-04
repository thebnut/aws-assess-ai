import { NextRequest, NextResponse } from 'next/server'
import formidable from 'formidable'
import { promises as fs } from 'fs'
import { createSession } from '@/lib/sessions'
import { parseQuestionsFromExcel } from '@/lib/excel'
import { SessionContext } from '@/types'

export const config = {
  api: {
    bodyParser: false,
  },
}

export async function POST(req: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await req.formData()
    
    const file = formData.get('file') as File
    const clientName = formData.get('clientName') as string
    const projectName = formData.get('projectName') as string
    const projectOverview = formData.get('projectOverview') as string

    if (!file || !clientName || !projectName || !projectOverview) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.name.endsWith('.xlsx')) {
      return NextResponse.json(
        { error: 'Only .xlsx files are supported' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Parse questions from Excel
    let questions
    try {
      questions = parseQuestionsFromExcel(buffer)
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 400 }
      )
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions found in the Excel file' },
        { status: 400 }
      )
    }

    // Create session context
    const context: SessionContext = {
      clientName,
      projectName,
      projectOverview
    }

    // Create session
    const sessionId = await createSession(context, questions)

    return NextResponse.json({
      sessionId,
      sessionUrl: `/session/${sessionId}`,
      questionsCount: questions.length
    })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  // Could implement getting all sessions for an admin view
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 })
}
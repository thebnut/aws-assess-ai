import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/sessions'
import { generateExcelFromQuestions } from '@/lib/excel'

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Get session
    const session = await getSession(params.sessionId)
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Generate Excel buffer
    const buffer = generateExcelFromQuestions(session.questions)

    // Create filename
    const filename = `${session.context.clientName}-${session.context.projectName}-assessment-${new Date().toISOString().split('T')[0]}.xlsx`
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-_.]/g, '')

    // Return Excel file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export assessment' },
      { status: 500 }
    )
  }
}
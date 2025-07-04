import { promises as fs } from 'fs'
import path from 'path'
import { nanoid } from 'nanoid'
import { Session, SessionContext, Question, SessionProgress } from '@/types'

const SESSIONS_DIR = path.join(process.cwd(), 'data', 'sessions')

// Ensure sessions directory exists
async function ensureSessionsDir() {
  try {
    await fs.mkdir(SESSIONS_DIR, { recursive: true })
  } catch (error) {
    // Directory already exists
  }
}

export async function createSession(
  context: SessionContext,
  questions: Question[]
): Promise<string> {
  await ensureSessionsDir()
  
  const sessionId = nanoid(10)
  const now = new Date().toISOString()
  
  const progress = calculateProgress(questions)
  
  const session: Session = {
    id: sessionId,
    context,
    questions,
    createdAt: now,
    updatedAt: now,
    progress
  }
  
  const sessionPath = path.join(SESSIONS_DIR, `${sessionId}.json`)
  await fs.writeFile(sessionPath, JSON.stringify(session, null, 2))
  
  return sessionId
}

export async function getSession(sessionId: string): Promise<Session | null> {
  try {
    const sessionPath = path.join(SESSIONS_DIR, `${sessionId}.json`)
    const data = await fs.readFile(sessionPath, 'utf-8')
    return JSON.parse(data) as Session
  } catch (error) {
    return null
  }
}

export async function updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
  const session = await getSession(sessionId)
  if (!session) {
    throw new Error('Session not found')
  }
  
  const updatedSession: Session = {
    ...session,
    ...updates,
    updatedAt: new Date().toISOString()
  }
  
  // Recalculate progress if questions were updated
  if (updates.questions) {
    updatedSession.progress = calculateProgress(updatedSession.questions)
  }
  
  const sessionPath = path.join(SESSIONS_DIR, `${sessionId}.json`)
  await fs.writeFile(sessionPath, JSON.stringify(updatedSession, null, 2))
}

export async function updateQuestionAnswer(
  sessionId: string,
  questionId: number,
  answer: string,
  answeredBy: string,
  comments?: string
): Promise<void> {
  const session = await getSession(sessionId)
  if (!session) {
    throw new Error('Session not found')
  }
  
  const questionIndex = session.questions.findIndex(q => q.id === questionId)
  if (questionIndex === -1) {
    throw new Error('Question not found')
  }
  
  session.questions[questionIndex] = {
    ...session.questions[questionIndex],
    answer,
    answeredBy,
    comments
  }
  
  await updateSession(sessionId, { questions: session.questions })
}

export async function getAllSessions(): Promise<Session[]> {
  await ensureSessionsDir()
  
  try {
    const files = await fs.readdir(SESSIONS_DIR)
    const sessions: Session[] = []
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const sessionId = file.replace('.json', '')
        const session = await getSession(sessionId)
        if (session) {
          sessions.push(session)
        }
      }
    }
    
    return sessions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  } catch (error) {
    return []
  }
}

export function calculateProgress(questions: Question[]): SessionProgress {
  const total = questions.length
  const answered = questions.filter(q => q.answer && q.answer.trim()).length
  const mandatory = questions.filter(q => q.mandatory).length
  const mandatoryAnswered = questions.filter(q => q.mandatory && q.answer && q.answer.trim()).length
  
  return {
    total,
    answered,
    mandatory,
    mandatoryAnswered,
    percentComplete: total > 0 ? Math.round((answered / total) * 100) : 0
  }
}

export function getNextUnansweredQuestion(questions: Question[]): Question | null {
  // First, find mandatory unanswered questions
  const mandatoryUnanswered = questions.find(q => 
    q.mandatory && (!q.answer || !q.answer.trim())
  )
  
  if (mandatoryUnanswered) {
    return mandatoryUnanswered
  }
  
  // Then find any unanswered question
  return questions.find(q => !q.answer || !q.answer.trim()) || null
}

export function getQuestionsByCategory(questions: Question[]): Record<string, Question[]> {
  const grouped: Record<string, Question[]> = {}
  
  questions.forEach(q => {
    if (!grouped[q.category]) {
      grouped[q.category] = []
    }
    grouped[q.category].push(q)
  })
  
  return grouped
}
export interface Question {
  id: number
  category: string
  question: string
  sufficiencyRule: string
  mandatory: boolean
  additionalContext?: string
  answer?: string
  answeredBy?: string
  comments?: string
}

export interface SessionContext {
  clientName: string
  projectName: string
  projectOverview: string
}

export interface Session {
  id: string
  context: SessionContext
  questions: Question[]
  createdAt: string
  updatedAt: string
  progress: SessionProgress
}

export interface SessionProgress {
  total: number
  answered: number
  mandatory: number
  mandatoryAnswered: number
  percentComplete: number
}

export interface Answer {
  questionId: number
  answer: string
  answeredBy: string
  timestamp: string
  comments?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  questionId?: number
}

export interface CreateSessionRequest {
  context: SessionContext
  file: File
}

export interface CreateSessionResponse {
  sessionId: string
  sessionUrl: string
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

export interface VoiceSettings {
  enabled: boolean
  autoListen: boolean
  speechRate: number
  speechPitch: number
  voice: string | null
}

export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}
'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Send, Loader2, Download, AlertCircle, CheckCircle2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { Session, ChatMessage } from '@/types'
import { useVoiceInteraction } from '@/hooks/useVoiceInteraction'

export default function SessionPage() {
  const { sessionId } = useParams()
  const [session, setSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastAiMessageRef = useRef<string>('')

  // Voice interaction hook
  const {
    voiceState,
    voiceSettings,
    transcript,
    isSupported: isVoiceSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleVoice,
    updateSettings,
    voiceError
  } = useVoiceInteraction({
    onTranscript: (text) => {
      setInput(text)
      sendMessage(text)
    },
    onCommand: (command) => {
      switch (command) {
        case 'skip':
          setInput('Skip this question')
          sendMessage('Skip this question')
          break
        case 'dont_know':
          setInput("I don't know")
          sendMessage("I don't know")
          break
        case 'not_applicable':
          setInput('Not applicable')
          sendMessage('Not applicable')
          break
      }
    }
  })

  useEffect(() => {
    loadSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadSession = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`)
      if (!response.ok) {
        throw new Error('Session not found')
      }
      const data = await response.json()
      setSession(data.session)
      
      // Add initial greeting message
      const firstQuestion = data.session.questions.find((q: any) => q.mandatory && !q.answer) || data.session.questions.find((q: any) => !q.answer)
      
      let greeting = `Hello! I'm here to help ${data.session.context.clientName} complete the AWS migration assessment for ${data.session.context.projectName}.\n\nBased on your project overview, I understand: ${data.session.context.projectOverview}\n\nI have ${data.session.questions.length} questions to go through with you. Let's start with the most important ones.\n\n`
      
      if (firstQuestion) {
        greeting += `**${firstQuestion.category}**\n${firstQuestion.question}`
        if (firstQuestion.additionalContext) {
          greeting += `\n\n*Additional context: ${firstQuestion.additionalContext}*`
        }
        if (firstQuestion.sufficiencyRule) {
          greeting += `\n\n(${firstQuestion.sufficiencyRule})`
        }
      }
      
      const initialMessage = {
        role: 'assistant' as const,
        content: greeting,
        timestamp: new Date().toISOString(),
        questionId: firstQuestion?.id
      }
      
      setMessages([initialMessage])
      
      // Speak initial greeting if voice is enabled
      if (voiceSettings.enabled) {
        setTimeout(() => speak(greeting), 500)
      }
    } catch (err) {
      setError('Failed to load assessment. Please check the URL and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input
    if (!text.trim() || isSending) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsSending(true)

    try {
      const response = await fetch(`/api/chat/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        questionId: data.questionId
      }

      setMessages(prev => [...prev, assistantMessage])
      
      // Speak the AI response if voice is enabled
      if (voiceSettings.enabled && data.response !== lastAiMessageRef.current) {
        lastAiMessageRef.current = data.response
        speak(data.response)
      }
      
      // Update session progress
      if (data.updatedSession) {
        setSession(data.updatedSession)
      }
    } catch (err) {
      setError('Failed to send message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/export/${sessionId}`)
      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${session?.context.clientName}-${session?.context.projectName}-assessment.xlsx`.replace(/\s+/g, '-')
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError('Failed to export assessment. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error && !session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-lg">{error}</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  const progressPercent = session.progress.percentComplete

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container">
          {/* Production warning - removed process.env check as it's not available client-side */}
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-xl font-semibold">
                Assessment for {session.context.clientName} - {session.context.projectName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {session.progress.answered} of {session.progress.total} questions answered
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{progressPercent}%</span>
              </div>
              
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-secondary"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container py-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          
          {isSending && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Voice status indicator */}
        {voiceSettings.enabled && voiceState !== 'idle' && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-background border rounded-full px-6 py-3 shadow-lg flex items-center gap-3">
            {voiceState === 'listening' && (
              <>
                <div className="flex gap-1">
                  <div className="w-1 h-4 bg-primary rounded-full animate-pulse" />
                  <div className="w-1 h-6 bg-primary rounded-full animate-pulse animation-delay-100" />
                  <div className="w-1 h-3 bg-primary rounded-full animate-pulse animation-delay-200" />
                  <div className="w-1 h-5 bg-primary rounded-full animate-pulse animation-delay-300" />
                  <div className="w-1 h-4 bg-primary rounded-full animate-pulse animation-delay-400" />
                </div>
                <span className="text-sm font-medium">Listening...</span>
                {transcript && (
                  <span className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {transcript}
                  </span>
                )}
              </>
            )}
            {voiceState === 'processing' && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Processing...</span>
              </>
            )}
            {voiceState === 'speaking' && (
              <>
                <Volume2 className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm font-medium">Speaking...</span>
                <button
                  onClick={stopSpeaking}
                  className="text-xs px-2 py-1 border rounded hover:bg-secondary"
                >
                  Stop
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container py-4">
          {(error || voiceError) && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error || voiceError}
            </div>
          )}
          
          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage()
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your answer..."
              className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
            
            {isVoiceSupported && (
              <button
                type="button"
                onClick={() => {
                  if (voiceState === 'listening') {
                    stopListening()
                  } else if (voiceState === 'idle' && voiceSettings.enabled) {
                    startListening()
                  } else {
                    toggleVoice()
                  }
                }}
                className={`px-4 py-2 border rounded-md transition-colors ${
                  voiceSettings.enabled
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'hover:bg-secondary'
                } ${voiceState === 'listening' ? 'animate-pulse' : ''}`}
                title={voiceSettings.enabled ? 'Voice enabled - click to start' : 'Voice disabled - click to enable'}
              >
                {voiceSettings.enabled ? (
                  voiceState === 'listening' ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )
                ) : (
                  <MicOff className="h-5 w-5" />
                )}
              </button>
            )}
          </form>
          
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setInput("I don't know")}
              className="text-xs px-3 py-1 border rounded-full hover:bg-secondary"
            >
              I don't know
            </button>
            <button
              onClick={() => setInput("Not applicable")}
              className="text-xs px-3 py-1 border rounded-full hover:bg-secondary"
            >
              Not applicable
            </button>
            <button
              onClick={() => setInput("Skip this question")}
              className="text-xs px-3 py-1 border rounded-full hover:bg-secondary"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
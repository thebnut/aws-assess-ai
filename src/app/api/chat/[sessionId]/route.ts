import { NextRequest, NextResponse } from 'next/server'
import { getSession, updateQuestionAnswer } from '@/lib/sessions'
import { processUserMessage, selectNextQuestion } from '@/lib/ai-assistant'
import { ChatMessage } from '@/types'

// Store chat history in memory (in production, use Redis or similar)
const chatHistories = new Map<string, ChatMessage[]>()

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { message } = await req.json()
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get session
    const session = await getSession(params.sessionId)
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Get or initialize chat history
    const chatHistory = chatHistories.get(params.sessionId) || []
    
    // Process the message with AI
    const aiResponse = await processUserMessage(session, message, chatHistory)
    
    // Update question answer if needed
    if (aiResponse.shouldUpdateAnswer && aiResponse.answer) {
      // Find the current question being answered
      let currentQuestionId: number | undefined
      
      // Look for the most recent question asked by the assistant
      for (let i = chatHistory.length - 1; i >= 0; i--) {
        if (chatHistory[i].role === 'assistant' && chatHistory[i].questionId) {
          currentQuestionId = chatHistory[i].questionId
          break
        }
      }
      
      if (currentQuestionId) {
        await updateQuestionAnswer(
          params.sessionId,
          currentQuestionId,
          aiResponse.answer,
          aiResponse.answeredBy || 'Client SME'
        )
      }
    }
    
    // If AI didn't specify a next question, select one
    let finalResponse = aiResponse.response
    let nextQuestionId = aiResponse.questionId
    
    if (!nextQuestionId && aiResponse.shouldUpdateAnswer) {
      const updatedSession = await getSession(params.sessionId)
      if (updatedSession) {
        const nextQuestion = selectNextQuestion(
          updatedSession.questions,
          updatedSession.context.projectOverview
        )
        
        if (nextQuestion) {
          nextQuestionId = nextQuestion.id
          finalResponse += `\n\nGreat! Let's move on to the next question.\n\n**${nextQuestion.category}**\n${nextQuestion.question}`
          
          if (nextQuestion.additionalContext) {
            finalResponse += `\n\n*Additional context: ${nextQuestion.additionalContext}*`
          }
          
          if (nextQuestion.sufficiencyRule) {
            finalResponse += `\n\n(${nextQuestion.sufficiencyRule})`
          }
        } else {
          finalResponse += "\n\nExcellent! You've completed all the questions in this assessment. You can now export the results using the Export button above."
        }
      }
    }
    
    // Update chat history
    const userMsg: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    }
    
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: finalResponse,
      timestamp: new Date().toISOString(),
      questionId: nextQuestionId
    }
    
    chatHistory.push(userMsg, assistantMsg)
    chatHistories.set(params.sessionId, chatHistory)
    
    // Get updated session for progress
    const updatedSession = await getSession(params.sessionId)
    
    return NextResponse.json({
      response: finalResponse,
      questionId: nextQuestionId,
      updatedSession
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}

// Get chat history
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const history = chatHistories.get(params.sessionId) || []
  return NextResponse.json({ history })
}
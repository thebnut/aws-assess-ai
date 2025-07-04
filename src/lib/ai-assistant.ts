import OpenAI from 'openai'
import { Session, Question, ChatMessage } from '@/types'
import { getNextUnansweredQuestion, getQuestionsByCategory } from './sessions'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface AIResponse {
  response: string
  questionId?: number
  shouldUpdateAnswer: boolean
  answer?: string
  answeredBy?: string
}

export async function processUserMessage(
  session: Session,
  userMessage: string,
  chatHistory: ChatMessage[]
): Promise<AIResponse> {
  const currentQuestion = findCurrentQuestion(session.questions, chatHistory)
  const nextQuestion = getNextUnansweredQuestion(session.questions)
  
  const systemPrompt = buildSystemPrompt(session, currentQuestion)
  const messages = buildMessages(systemPrompt, chatHistory, userMessage)

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
      max_tokens: 800,
    })

    const aiResponse = completion.choices[0]?.message?.content || ''
    
    // Parse AI response to determine if it contains an answer
    const result = parseAIResponse(aiResponse, currentQuestion, userMessage)
    
    return result
  } catch (error) {
    console.error('OpenAI API error:', error)
    return {
      response: "I'm having trouble processing your message. Could you please try again?",
      shouldUpdateAnswer: false
    }
  }
}

function buildSystemPrompt(session: Session, currentQuestion: Question | null): string {
  const { clientName, projectName, projectOverview } = session.context
  const categoryStats = getCategoryProgress(session.questions)
  
  return `You are an AWS migration assessment assistant helping ${clientName} complete an assessment for ${projectName}.

Project Context:
${projectOverview}

Your role:
1. Ask questions from the assessment one at a time, starting with mandatory questions
2. Use the sufficiency rules to ensure answers have enough detail
3. Skip questions that aren't relevant based on the project context
4. Be conversational but professional
5. If an answer lacks detail per the sufficiency rule, ask follow-up questions
6. Move to the next question only when the current one is sufficiently answered

Progress:
- Total questions: ${session.questions.length}
- Answered: ${session.progress.answered}
- Mandatory remaining: ${session.progress.mandatory - session.progress.mandatoryAnswered}

Categories: ${Object.entries(categoryStats).map(([cat, stats]) => 
  `${cat} (${stats.answered}/${stats.total})`
).join(', ')}

${currentQuestion ? `
Current Question:
- Category: ${currentQuestion.category}
- Question: ${currentQuestion.question}
- Sufficiency Rule: ${currentQuestion.sufficiencyRule}
- Mandatory: ${currentQuestion.mandatory ? 'Yes' : 'No'}
${currentQuestion.additionalContext ? `- Context: ${currentQuestion.additionalContext}` : ''}
` : 'No current question - select the next appropriate question.'}

Instructions:
- If the user's response answers the current question, acknowledge it and move to the next question
- If the answer lacks detail per the sufficiency rule, ask for more specific information
- For "I don't know" or "Not applicable" responses, accept them and move on
- Skip questions that are clearly not relevant to the project (e.g., manufacturing questions for a retail project)
- Use the project overview to make questions more specific and relevant
- When asking a specific question from the assessment, include [QUESTION_ID:XX] at the end of your response where XX is the question ID`
}

function buildMessages(
  systemPrompt: string,
  chatHistory: ChatMessage[],
  userMessage: string
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt }
  ]

  // Add chat history
  chatHistory.forEach(msg => {
    messages.push({
      role: msg.role,
      content: msg.content
    })
  })

  // Add current user message
  messages.push({
    role: 'user',
    content: userMessage
  })

  return messages
}

function findCurrentQuestion(
  questions: Question[],
  chatHistory: ChatMessage[]
): Question | null {
  // Find the last question asked by the assistant
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const msg = chatHistory[i]
    if (msg.role === 'assistant' && msg.questionId) {
      return questions.find(q => q.id === msg.questionId) || null
    }
  }
  
  // Check if any question was mentioned in recent messages
  const recentMessages = chatHistory.slice(-5)
  for (const question of questions) {
    if (question.answer) continue // Skip already answered
    
    for (const msg of recentMessages) {
      if (msg.content.toLowerCase().includes(question.question.toLowerCase().substring(0, 50))) {
        return question
      }
    }
  }
  
  return null
}

function parseAIResponse(
  aiResponse: string,
  currentQuestion: Question | null,
  userMessage: string
): AIResponse {
  // Check if this is an answer to the current question
  const isAnswer = currentQuestion && (
    userMessage.length > 10 || // Substantial response
    userMessage.toLowerCase().includes("don't know") ||
    userMessage.toLowerCase().includes("not applicable") ||
    userMessage.toLowerCase().includes("n/a")
  )

  if (isAnswer && currentQuestion) {
    // Extract question ID from the response if the AI is moving to next question
    const questionIdMatch = aiResponse.match(/\[QUESTION_ID:(\d+)\]/);
    const nextQuestionId = questionIdMatch ? parseInt(questionIdMatch[1]) : undefined;
    
    return {
      response: aiResponse.replace(/\[QUESTION_ID:\d+\]/, '').trim(),
      questionId: nextQuestionId,
      shouldUpdateAnswer: true,
      answer: userMessage,
      answeredBy: 'Client SME'
    }
  }

  // Check if AI is asking a new question
  const questionIdMatch = aiResponse.match(/\[QUESTION_ID:(\d+)\]/);
  if (questionIdMatch) {
    return {
      response: aiResponse.replace(/\[QUESTION_ID:\d+\]/, '').trim(),
      questionId: parseInt(questionIdMatch[1]),
      shouldUpdateAnswer: false
    }
  }

  return {
    response: aiResponse,
    shouldUpdateAnswer: false
  }
}

function getCategoryProgress(questions: Question[]): Record<string, { total: number; answered: number }> {
  const stats: Record<string, { total: number; answered: number }> = {}
  
  questions.forEach(q => {
    if (!stats[q.category]) {
      stats[q.category] = { total: 0, answered: 0 }
    }
    stats[q.category].total++
    if (q.answer) {
      stats[q.category].answered++
    }
  })
  
  return stats
}

export function selectNextQuestion(
  questions: Question[],
  projectOverview: string
): Question | null {
  // First, prioritize mandatory unanswered questions
  const mandatoryUnanswered = questions.filter(q => 
    q.mandatory && (!q.answer || !q.answer.trim())
  )

  if (mandatoryUnanswered.length > 0) {
    // Group by category and select from the category with most unanswered
    const byCategory = getQuestionsByCategory(mandatoryUnanswered)
    const categories = Object.entries(byCategory)
      .sort((a, b) => b[1].length - a[1].length)
    
    return categories[0][1][0]
  }

  // Then any unanswered questions
  const unanswered = questions.filter(q => !q.answer || !q.answer.trim())
  
  if (unanswered.length === 0) {
    return null
  }

  // Filter out clearly irrelevant questions based on project overview
  const relevant = unanswered.filter(q => {
    const questionLower = q.question.toLowerCase()
    const overviewLower = projectOverview.toLowerCase()
    
    // Skip manufacturing questions for non-manufacturing projects
    if (questionLower.includes('manufacturing') && !overviewLower.includes('manufactur')) {
      return false
    }
    
    // Skip healthcare questions for non-healthcare projects
    if (questionLower.includes('healthcare') && !overviewLower.includes('health')) {
      return false
    }
    
    return true
  })

  return relevant[0] || unanswered[0]
}
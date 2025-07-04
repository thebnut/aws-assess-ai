import * as XLSX from 'xlsx'
import { Question } from '@/types'

export function parseQuestionsFromExcel(buffer: Buffer): Question[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  
  // Get the Questions sheet
  const questionsSheet = workbook.Sheets['Questions']
  if (!questionsSheet) {
    throw new Error('No "Questions" sheet found in the Excel file')
  }

  // Convert to JSON with headers
  const data = XLSX.utils.sheet_to_json(questionsSheet, { header: 1 }) as any[]
  
  if (data.length < 2) {
    throw new Error('Excel file must contain headers and at least one question')
  }

  // Extract headers (first row)
  const headers = data[0] as string[]
  
  // Find column indices
  const columnIndices = {
    id: headers.findIndex(h => h === '#'),
    category: headers.findIndex(h => h === 'Category'),
    question: headers.findIndex(h => h === 'Question'),
    sufficiencyRule: headers.findIndex(h => h === 'Sufficiency Rule'),
    mandatory: headers.findIndex(h => h === 'Madatory?' || h === 'Mandatory?'), // Handle typo
    additionalContext: headers.findIndex(h => h === 'Additional Context'),
    answer: headers.findIndex(h => h === 'Answer'),
    answeredBy: headers.findIndex(h => h === 'Answered By'),
    comments: headers.findIndex(h => h === 'Comments')
  }

  // Validate required columns exist
  if (columnIndices.id === -1 || columnIndices.category === -1 || 
      columnIndices.question === -1 || columnIndices.sufficiencyRule === -1) {
    throw new Error('Excel file missing required columns: #, Category, Question, or Sufficiency Rule')
  }

  // Parse questions (skip header row)
  const questions: Question[] = []
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i] as any[]
    
    // Skip empty rows
    if (!row[columnIndices.id] || !row[columnIndices.question]) {
      continue
    }

    const question: Question = {
      id: parseInt(row[columnIndices.id]?.toString() || '0'),
      category: row[columnIndices.category]?.toString() || '',
      question: row[columnIndices.question]?.toString() || '',
      sufficiencyRule: row[columnIndices.sufficiencyRule]?.toString() || '',
      mandatory: row[columnIndices.mandatory]?.toString()?.toUpperCase() === 'Y',
      additionalContext: row[columnIndices.additionalContext]?.toString() || undefined,
      answer: row[columnIndices.answer]?.toString() || undefined,
      answeredBy: row[columnIndices.answeredBy]?.toString() || undefined,
      comments: row[columnIndices.comments]?.toString() || undefined
    }

    questions.push(question)
  }

  return questions
}

export function generateExcelFromQuestions(questions: Question[]): Buffer {
  // Create a new workbook
  const workbook = XLSX.utils.book_new()

  // Prepare data for the Questions sheet
  const data: any[][] = []
  
  // Add headers
  data.push([
    '#',
    'Category',
    'Question',
    'Sufficiency Rule',
    'Mandatory?',
    'Additional Context',
    'Answer',
    'Answered By',
    'Comments'
  ])

  // Add questions
  questions.forEach(q => {
    data.push([
      q.id,
      q.category,
      q.question,
      q.sufficiencyRule,
      q.mandatory ? 'Y' : 'N',
      q.additionalContext || '',
      q.answer || '',
      q.answeredBy || '',
      q.comments || ''
    ])
  })

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data)

  // Set column widths
  const columnWidths = [
    { wch: 5 },   // #
    { wch: 20 },  // Category
    { wch: 60 },  // Question
    { wch: 40 },  // Sufficiency Rule
    { wch: 12 },  // Mandatory?
    { wch: 30 },  // Additional Context
    { wch: 50 },  // Answer
    { wch: 20 },  // Answered By
    { wch: 30 }   // Comments
  ]
  worksheet['!cols'] = columnWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions')

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  return buffer
}

export function getCategoryStats(questions: Question[]): Record<string, { total: number; answered: number }> {
  const stats: Record<string, { total: number; answered: number }> = {}

  questions.forEach(q => {
    if (!stats[q.category]) {
      stats[q.category] = { total: 0, answered: 0 }
    }
    stats[q.category].total++
    if (q.answer && q.answer.trim()) {
      stats[q.category].answered++
    }
  })

  return stats
}
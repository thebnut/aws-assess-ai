'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileSpreadsheet, Loader2, CheckCircle, Copy } from 'lucide-react'

export default function UploadPage() {
  const router = useRouter()
  const [clientName, setClientName] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectOverview, setProjectOverview] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [sessionUrl, setSessionUrl] = useState('')
  const [error, setError] = useState('')

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith('.xlsx')) {
      setFile(droppedFile)
      setError('')
    } else {
      setError('Please upload an Excel (.xlsx) file')
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.name.endsWith('.xlsx')) {
      setFile(selectedFile)
      setError('')
    } else {
      setError('Please upload an Excel (.xlsx) file')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file || !clientName || !projectName || !projectOverview) {
      setError('Please fill in all fields and select a file')
      return
    }

    setIsUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('clientName', clientName)
    formData.append('projectName', projectName)
    formData.append('projectOverview', projectOverview)

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      const url = `${window.location.origin}/session/${data.sessionId}`
      setSessionUrl(url)
      
      // Copy to clipboard
      await navigator.clipboard.writeText(url)
    } catch (err) {
      setError('Failed to create assessment. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(sessionUrl)
    // Could add a toast notification here
  }

  if (sessionUrl) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold">Assessment Created!</h1>
            <p className="mt-2 text-muted-foreground">
              Share this link with your client to begin the assessment
            </p>
          </div>

          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sessionUrl}
                readOnly
                className="flex-1 px-4 py-2 border rounded-md bg-secondary"
              />
              <button
                onClick={copyToClipboard}
                className="p-2 border rounded-md hover:bg-secondary transition-colors"
                title="Copy to clipboard"
              >
                <Copy className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground text-center">
              Link copied to clipboard ✅
            </p>
          </div>

          <div className="bg-secondary/20 rounded-lg p-6">
            <h2 className="font-semibold mb-3">Next Steps:</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Share the link with client SMEs who will provide information</li>
              <li>Monitor progress as they answer questions</li>
              <li>Export the completed assessment when ready</li>
            </ol>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-secondary"
            >
              Create Another Assessment
            </button>
            <button
              onClick={() => router.push(`/session/${sessionUrl.split('/').pop()}`)}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              View Assessment
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 pb-32">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Upload Assessment</h1>
          <p className="mt-2 text-muted-foreground">
            Create a new AWS migration assessment for your client
          </p>
        </div>

        {process.env.NODE_ENV === 'production' && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> Assessments should be completed in a single session. 
              Progress is not permanently saved between sessions in this demo environment.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="clientName" className="block text-sm font-medium mb-2">
                Client Name
              </label>
              <input
                id="clientName"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Acme Corporation"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label htmlFor="projectName" className="block text-sm font-medium mb-2">
                Project Name
              </label>
              <input
                id="projectName"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="E-commerce Platform Migration"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label htmlFor="projectOverview" className="block text-sm font-medium mb-2">
                Project Overview
              </label>
              <textarea
                id="projectOverview"
                value={projectOverview}
                onChange={(e) => setProjectOverview(e.target.value)}
                placeholder="Migration of legacy retail platform with inventory, orders, and payment microservices to AWS. Currently running on-premise with 2TB database and serving 10k daily users..."
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Assessment Template
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              } ${file ? 'bg-secondary/20' : ''}`}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <input
                id="fileInput"
                type="file"
                accept=".xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {file ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-primary" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">Click to change file</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="font-medium">Drag Excel file here or click to browse</p>
                  <p className="text-sm text-muted-foreground">Only .xlsx files are supported</p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || !clientName || !projectName || !projectOverview || isUploading}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating Assessment...
              </>
            ) : (
              'Create Assessment'
            )}
          </button>
        </form>
      </div>
    </main>
  )
}
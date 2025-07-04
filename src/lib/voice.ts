import { VoiceSettings } from '@/types'

// Browser compatibility interfaces
interface IWindow extends Window {
  SpeechRecognition: typeof SpeechRecognition
  webkitSpeechRecognition: typeof SpeechRecognition
  speechSynthesis: SpeechSynthesis
}

declare const window: IWindow

export class VoiceRecognition {
  private recognition: SpeechRecognition | null = null
  private isListening = false

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        console.log('[Voice] SpeechRecognition available:', !!SpeechRecognition)
        
        if (SpeechRecognition) {
          this.recognition = new SpeechRecognition()
          this.recognition.continuous = false
          this.recognition.interimResults = true
          this.recognition.lang = 'en-US'
          console.log('[Voice] SpeechRecognition initialized successfully')
        }
      } catch (error) {
        console.error('[Voice] Failed to initialize SpeechRecognition:', error)
      }
    }
  }

  isSupported(): boolean {
    return this.recognition !== null
  }

  start(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ): void {
    if (!this.recognition) {
      console.error('[Voice] Recognition not initialized')
      onError('Speech recognition not available')
      return
    }
    
    if (this.isListening) {
      console.warn('[Voice] Already listening')
      return
    }

    console.log('[Voice] Starting recognition...')
    this.isListening = true

    this.recognition.onresult = (event: any) => {
      const result = event.results[event.resultIndex]
      const transcript = result[0].transcript
      const isFinal = result.isFinal
      console.log('[Voice] Result:', { transcript, isFinal })
      onResult(transcript, isFinal)
    }

    this.recognition.onerror = (event: any) => {
      console.error('[Voice] Recognition error event:', event)
      this.isListening = false
      onError(event.error || 'Unknown error')
    }

    this.recognition.onend = () => {
      console.log('[Voice] Recognition ended')
      this.isListening = false
      onEnd()
    }

    try {
      // Check if we're in a secure context (HTTPS)
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        console.error('[Voice] Not in secure context (HTTPS required)')
        onError('Microphone access requires HTTPS')
        return
      }
      
      this.recognition.start()
      console.log('[Voice] Recognition started successfully')
    } catch (error: any) {
      console.error('[Voice] Failed to start recognition:', error)
      this.isListening = false
      onError(error.message || 'Failed to start recognition')
    }
  }

  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      this.isListening = false
    }
  }

  abort(): void {
    if (this.recognition && this.isListening) {
      this.recognition.abort()
      this.isListening = false
    }
  }
}

export class VoiceSynthesis {
  private synthesis: SpeechSynthesis | null = null
  private currentUtterance: SpeechSynthesisUtterance | null = null

  constructor() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.synthesis = window.speechSynthesis
    }
  }

  isSupported(): boolean {
    return this.synthesis !== null
  }

  speak(
    text: string,
    settings: VoiceSettings,
    onEnd?: () => void,
    onError?: (error: string) => void
  ): void {
    if (!this.synthesis) return

    // Cancel any ongoing speech
    this.stop()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = settings.speechRate
    utterance.pitch = settings.speechPitch
    utterance.lang = 'en-US'

    // Set voice if specified
    if (settings.voice) {
      const voices = this.synthesis.getVoices()
      const selectedVoice = voices.find(v => v.name === settings.voice)
      if (selectedVoice) {
        utterance.voice = selectedVoice
      }
    }

    utterance.onend = () => {
      this.currentUtterance = null
      onEnd?.()
    }

    utterance.onerror = (event) => {
      this.currentUtterance = null
      onError?.(event.error)
    }

    this.currentUtterance = utterance
    this.synthesis.speak(utterance)
  }

  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel()
      this.currentUtterance = null
    }
  }

  pause(): void {
    if (this.synthesis) {
      this.synthesis.pause()
    }
  }

  resume(): void {
    if (this.synthesis) {
      this.synthesis.resume()
    }
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return []
    return this.synthesis.getVoices().filter(voice => voice.lang.startsWith('en'))
  }

  isSpeaking(): boolean {
    return this.synthesis?.speaking || false
  }
}

// Default voice settings
export const defaultVoiceSettings: VoiceSettings = {
  enabled: false,
  autoListen: true,
  speechRate: 1.0,
  speechPitch: 1.0,
  voice: null
}

// Load voice settings from localStorage
export function loadVoiceSettings(): VoiceSettings {
  if (typeof window === 'undefined') return defaultVoiceSettings
  
  const stored = localStorage.getItem('voiceSettings')
  if (stored) {
    try {
      return { ...defaultVoiceSettings, ...JSON.parse(stored) }
    } catch {
      return defaultVoiceSettings
    }
  }
  return defaultVoiceSettings
}

// Save voice settings to localStorage
export function saveVoiceSettings(settings: VoiceSettings): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('voiceSettings', JSON.stringify(settings))
  }
}

// Voice command detection
export function detectVoiceCommand(transcript: string): string | null {
  const commands = {
    'skip this question': 'skip',
    'skip question': 'skip',
    'next question': 'skip',
    "i don't know": 'dont_know',
    'not applicable': 'not_applicable',
    'n a': 'not_applicable',
    'stop voice': 'stop_voice',
    'pause voice': 'stop_voice',
  }

  const lowercaseTranscript = transcript.toLowerCase().trim()
  
  for (const [phrase, command] of Object.entries(commands)) {
    if (lowercaseTranscript.includes(phrase)) {
      return command
    }
  }
  
  return null
}
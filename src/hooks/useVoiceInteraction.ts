import { useState, useEffect, useRef, useCallback } from 'react'
import { VoiceState, VoiceSettings } from '@/types'
import {
  VoiceRecognition,
  VoiceSynthesis,
  loadVoiceSettings,
  saveVoiceSettings,
  detectVoiceCommand,
  defaultVoiceSettings
} from '@/lib/voice'

interface UseVoiceInteractionProps {
  onTranscript: (transcript: string) => void
  onCommand?: (command: string) => void
  enabled?: boolean
}

interface UseVoiceInteractionReturn {
  voiceState: VoiceState
  voiceSettings: VoiceSettings
  transcript: string
  isSupported: boolean
  startListening: () => void
  stopListening: () => void
  speak: (text: string) => void
  stopSpeaking: () => void
  toggleVoice: () => void
  updateSettings: (settings: Partial<VoiceSettings>) => void
  voiceError: string | null
}

export function useVoiceInteraction({
  onTranscript,
  onCommand,
  enabled = true
}: UseVoiceInteractionProps): UseVoiceInteractionReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(defaultVoiceSettings)
  const [transcript, setTranscript] = useState('')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  const recognitionRef = useRef<VoiceRecognition | null>(null)
  const synthesisRef = useRef<VoiceSynthesis | null>(null)
  const autoListenTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize voice services
  useEffect(() => {
    recognitionRef.current = new VoiceRecognition()
    synthesisRef.current = new VoiceSynthesis()
    
    const settings = loadVoiceSettings()
    setVoiceSettings(settings)
    
    const supported = recognitionRef.current.isSupported() && synthesisRef.current.isSupported()
    setIsSupported(supported)

    return () => {
      if (autoListenTimeoutRef.current) {
        clearTimeout(autoListenTimeoutRef.current)
      }
    }
  }, [])

  // Handle voice recognition
  const startListening = useCallback(() => {
    console.log('[Voice] Starting voice recognition...', {
      recognitionAvailable: !!recognitionRef.current,
      enabled,
      voiceSettingsEnabled: voiceSettings.enabled,
      isSupported
    })
    
    if (!recognitionRef.current || !enabled || !voiceSettings.enabled) {
      console.log('[Voice] Cannot start - missing requirements')
      return
    }
    
    setVoiceError(null)
    setTranscript('')
    setVoiceState('listening')

    recognitionRef.current.start(
      (text, isFinal) => {
        setTranscript(text)
        
        if (isFinal) {
          setVoiceState('processing')
          
          // Check for voice commands
          const command = detectVoiceCommand(text)
          if (command) {
            onCommand?.(command)
            if (command === 'stop_voice') {
              updateSettings({ enabled: false })
              return
            }
          } else {
            onTranscript(text)
          }
        }
      },
      (error) => {
        console.error('[Voice] Recognition error:', error)
        setVoiceError(error)
        setVoiceState('idle')
        
        // Handle common errors with more specific messages
        if (error === 'not-allowed') {
          setVoiceError('Microphone access denied. Please enable microphone permissions in your browser settings.')
        } else if (error === 'network') {
          setVoiceError('Speech recognition service unavailable. Please try again.')
        } else if (error === 'no-speech') {
          setVoiceError('No speech detected. Please try again.')
        } else if (error === 'aborted') {
          setVoiceError('Speech recognition was cancelled.')
        } else {
          setVoiceError(`Voice error: ${error}`)
        }
      },
      () => {
        setVoiceState('idle')
      }
    )
  }, [enabled, voiceSettings.enabled, onTranscript, onCommand, isSupported])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setVoiceState('idle')
    }
  }, [])

  // Handle text-to-speech
  const speak = useCallback((text: string) => {
    if (!synthesisRef.current || !enabled || !voiceSettings.enabled) return

    // Stop any ongoing speech
    synthesisRef.current.stop()
    
    // Cancel auto-listen timer
    if (autoListenTimeoutRef.current) {
      clearTimeout(autoListenTimeoutRef.current)
      autoListenTimeoutRef.current = null
    }

    setVoiceState('speaking')

    synthesisRef.current.speak(
      text,
      voiceSettings,
      () => {
        setVoiceState('idle')
        
        // Auto-listen after speaking if enabled
        if (voiceSettings.autoListen && voiceSettings.enabled) {
          autoListenTimeoutRef.current = setTimeout(() => {
            startListening()
          }, 500)
        }
      },
      (error) => {
        setVoiceError(`Speech error: ${error}`)
        setVoiceState('idle')
      }
    )
  }, [enabled, voiceSettings, startListening])

  const stopSpeaking = useCallback(() => {
    if (synthesisRef.current) {
      synthesisRef.current.stop()
      setVoiceState('idle')
    }
  }, [])

  const toggleVoice = useCallback(() => {
    const newSettings = { ...voiceSettings, enabled: !voiceSettings.enabled }
    setVoiceSettings(newSettings)
    saveVoiceSettings(newSettings)
    
    if (!newSettings.enabled) {
      stopListening()
      stopSpeaking()
    }
  }, [voiceSettings, stopListening, stopSpeaking])

  const updateSettings = useCallback((updates: Partial<VoiceSettings>) => {
    const newSettings = { ...voiceSettings, ...updates }
    setVoiceSettings(newSettings)
    saveVoiceSettings(newSettings)
  }, [voiceSettings])

  // Auto-speak AI responses when voice is enabled
  useEffect(() => {
    if (voiceState === 'processing') {
      // Reset to idle after processing
      const timeout = setTimeout(() => {
        setVoiceState('idle')
      }, 100)
      return () => clearTimeout(timeout)
    }
  }, [voiceState])

  return {
    voiceState,
    voiceSettings,
    transcript,
    isSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleVoice,
    updateSettings,
    voiceError
  }
}
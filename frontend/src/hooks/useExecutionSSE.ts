import { useEffect, useRef, useState, useCallback } from 'react'
import type { ExecutionEvent } from '../types'

export type SSEConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface UseExecutionSSEResult {
  events: ExecutionEvent[]
  connectionState: SSEConnectionState
  reconnect: () => void
}

const MAX_EVENTS = 500

export function useExecutionSSE(executionId: string): UseExecutionSSEResult {
  const [events, setEvents] = useState<ExecutionEvent[]>([])
  const [connectionState, setConnectionState] = useState<SSEConnectionState>('connecting')
  const sourceRef = useRef<EventSource | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idRef = useRef(executionId)

  const connect = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close()
      sourceRef.current = null
    }

    setConnectionState('connecting')
    const source = new EventSource(`/api/executions/${idRef.current}/stream`)
    sourceRef.current = source

    source.onopen = () => {
      setConnectionState('connected')
    }

    source.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data) as ExecutionEvent
        if (parsed && parsed.id) {
          setEvents(prev => {
            if (prev.some(ev => ev.id === parsed.id)) return prev
            const next = [...prev, parsed]
            return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next
          })
        }
      } catch {
        // ignore parse errors
      }
    }

    source.onerror = () => {
      setConnectionState('disconnected')
      source.close()
      sourceRef.current = null
      reconnectTimer.current = setTimeout(() => {
        setConnectionState('connecting')
        connect()
      }, 3000)
    }
  }, [])

  const reconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }
    connect()
  }, [connect])

  useEffect(() => {
    idRef.current = executionId
    setEvents([])
    connect()

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
      if (sourceRef.current) {
        sourceRef.current.close()
        sourceRef.current = null
      }
    }
  }, [executionId, connect])

  return { events, connectionState, reconnect }
}

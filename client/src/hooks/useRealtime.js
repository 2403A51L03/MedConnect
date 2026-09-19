import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getAccessToken } from '../services/session.js'

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000'

export function useRealtime(onDataChange) {
  const [status, setStatus] = useState('offline')
  const onDataChangeRef = useRef(onDataChange)
  onDataChangeRef.current = onDataChange

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return undefined

    const socket = io(socketUrl, { auth: { token }, reconnection: true, reconnectionAttempts: Infinity })
    const refresh = () => onDataChangeRef.current()
    socket.on('connect', () => { setStatus('connected'); onDataChangeRef.current() })
    socket.on('disconnect', () => setStatus('offline'))
    socket.on('connect_error', () => setStatus('offline'))
    socket.on('queue:updated', refresh)
    socket.on('queue:called', refresh)
    socket.on('notification:new', refresh)
    socket.on('consultation:available', refresh)
    socket.on('doctor:availability-changed', refresh)
    return () => socket.disconnect()
  }, [])

  return status
}

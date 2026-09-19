import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getAccessToken } from '../services/session.js'

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000'

function normalizeErrorMessage(error) {
  if (!error) return 'Unable to start the consultation.'
  if (error.name === 'NotAllowedError') return 'Camera or microphone permission was denied.'
  if (error.name === 'NotFoundError' || error.name === 'NotReadableError') return 'No camera or microphone was detected on this device.'
  if (error.name === 'NotSupportedError') return 'This browser does not support video calls.'
  return error.message || 'Unable to start the consultation.'
}

export function TeleConsultationPanel({ user, queueEntryId, roleLabel = 'Patient' }) {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const socketRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const streamRef = useRef(null)
  const queueEntryIdRef = useRef(queueEntryId)

  useEffect(() => {
    queueEntryIdRef.current = queueEntryId
  }, [queueEntryId])

  useEffect(() => () => {
    if (socketRef.current) {
      socketRef.current.emit('leave-consultation', { queueEntryId: queueEntryIdRef.current })
      socketRef.current.disconnect()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }
  }, [])

  async function ensurePeerConnection() {
    if (peerConnectionRef.current) return peerConnectionRef.current

    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams
      if (remoteStream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream
      }
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && queueEntryIdRef.current) {
        socketRef.current.emit('webrtc-ice-candidate', {
          queueEntryId: queueEntryIdRef.current,
          candidate: event.candidate,
        })
      }
    }

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
        setStatus('connection-failed')
        setError('The consultation connection failed. Please retry or rejoin.')
      }
    }

    peerConnectionRef.current = peerConnection
    return peerConnection
  }

  async function startConsultation() {
    if (!queueEntryIdRef.current || !user) {
      setError('No active consultation is available.')
      return
    }

    setError('')
    const token = getAccessToken()
    if (!token) {
      setError('Please sign in before joining a consultation.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const socket = io(socketUrl, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: Infinity,
      })

      socketRef.current = socket

      socket.on('connect', () => {
        setStatus('joining')
        socket.emit('join-consultation', { queueEntryId: queueEntryIdRef.current })
      })

      socket.on('consultation:joined', async () => {
        setStatus('connected')
        const peerConnection = await ensurePeerConnection()
        stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream))
        if (user.role === 'DOCTOR') {
          const offer = await peerConnection.createOffer()
          await peerConnection.setLocalDescription(offer)
          socket.emit('webrtc-offer', { queueEntryId: queueEntryIdRef.current, offer })
        }
      })

      socket.on('webrtc-offer', async ({ offer }) => {
        const peerConnection = await ensurePeerConnection()
        stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream))
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)
        socket.emit('webrtc-answer', { queueEntryId: queueEntryIdRef.current, answer })
      })

      socket.on('webrtc-answer', async ({ answer }) => {
        const peerConnection = await ensurePeerConnection()
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      })

      socket.on('webrtc-ice-candidate', async ({ candidate }) => {
        if (!candidate) return
        const peerConnection = await ensurePeerConnection()
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
        } catch {
          // ignore stale ICE candidates during reconnect
        }
      })

      socket.on('consultation:error', ({ message }) => {
        setStatus('error')
        setError(message)
      })

      socket.on('consultation:ended', ({ endedBy }) => {
        setStatus('ended')
        setError(endedBy === user.id ? 'You left the consultation.' : 'The consultation ended.')
      })

      socket.on('connect_error', () => {
        setStatus('connection-failed')
        setError('Socket connection failed. Please check the server and try again.')
      })
    } catch (connectionError) {
      setStatus('error')
      setError(normalizeErrorMessage(connectionError))
    }
  }

  function leaveConsultation() {
    if (socketRef.current && queueEntryIdRef.current) {
      socketRef.current.emit('leave-consultation', { queueEntryId: queueEntryIdRef.current })
      socketRef.current.disconnect()
      socketRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    setStatus('idle')
    setError('')
  }

  if (!queueEntryId || !user) return null

  return (
    <div className="dashboard-card consultation-card">
      <h3>{roleLabel} consultation</h3>
      <p className="realtime-status connected">Status: {status}</p>
      {error && <p className="dashboard-error">{error}</p>}
      <div className="consultation-videos">
        <video ref={localVideoRef} autoPlay muted playsInline className="video local-video" />
        <video ref={remoteVideoRef} autoPlay playsInline className="video remote-video" />
      </div>
      <div className="consultation-actions">
        {status === 'idle' && <button type="button" className="queue-action" onClick={startConsultation}>Join consultation</button>}
        {status !== 'idle' && status !== 'ended' && (
          <button type="button" className="queue-action" onClick={leaveConsultation}>Leave consultation</button>
        )}
      </div>
    </div>
  )
}

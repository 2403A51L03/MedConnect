import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { requestApi } from '../services/api.js'
import { getAccessToken } from '../services/session.js'

function getSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL
  if (import.meta.env.VITE_API_URL && /^https?:\/\//.test(import.meta.env.VITE_API_URL)) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
  }
  return window.location.origin
}

const socketUrl = getSocketUrl()
const defaultIceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

function hasTurnServer(iceServers) {
  return iceServers.some((server) => {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
    return urls.some((url) => typeof url === 'string' && /^(turn|turns):/i.test(url))
  })
}

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
  const localTracksAddedRef = useRef(false)
  const offerInProgressRef = useRef(false)
  const queueEntryIdRef = useRef(queueEntryId)
  const pendingCandidatesRef = useRef([])
  const iceServersRef = useRef(defaultIceServers)
  const turnConfiguredRef = useRef(false)
  const [isMuted, setIsMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [remotePlaybackNeedsGesture, setRemotePlaybackNeedsGesture] = useState(false)

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
    pendingCandidatesRef.current = []
    localTracksAddedRef.current = false
    offerInProgressRef.current = false
  }, [])

  async function ensurePeerConnection() {
    if (peerConnectionRef.current) return peerConnectionRef.current

    const peerConnection = new RTCPeerConnection({ iceServers: iceServersRef.current })

    peerConnection.ontrack = (event) => {
      if (!remoteVideoRef.current) return
      if (event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0]
        remoteVideoRef.current.play().then(
          () => setRemotePlaybackNeedsGesture(false),
          () => setRemotePlaybackNeedsGesture(true),
        )
        return
      }
      const remoteStream = remoteVideoRef.current.srcObject || new MediaStream()
      remoteStream.addTrack(event.track)
      remoteVideoRef.current.srcObject = remoteStream
      remoteVideoRef.current.play().then(
        () => setRemotePlaybackNeedsGesture(false),
        () => setRemotePlaybackNeedsGesture(true),
      )
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
      if (peerConnection.connectionState === 'connected') {
        setStatus('connected')
        setError('')
      } else if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
        setStatus('connection-failed')
        setError(turnConfiguredRef.current
          ? 'Audio/video could not connect. Check the TURN service, network/firewall settings, then leave and rejoin.'
          : 'Audio/video could not connect. No TURN relay is configured; add the Metered Open Relay settings to the API service, then leave and rejoin.')
      }
    }

    peerConnectionRef.current = peerConnection
    return peerConnection
  }

  function addLocalTracks(peerConnection, stream) {
    if (localTracksAddedRef.current) return
    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream))
    localTracksAddedRef.current = true
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
      setStatus('joining')
      iceServersRef.current = defaultIceServers
      turnConfiguredRef.current = false
      try {
        const { iceServers } = await requestApi('/realtime/ice-servers')
        if (!Array.isArray(iceServers)) throw new Error('The server returned invalid TURN settings.')
        iceServersRef.current = [...defaultIceServers, ...iceServers]
        turnConfiguredRef.current = hasTurnServer(iceServers)
        if (!turnConfiguredRef.current) {
          setError('TURN relay is not configured; attempting a direct connection. Configure Metered Open Relay on the API service if the call cannot connect.')
        }
      } catch (turnError) {
        console.error('Unable to load TURN relay configuration', turnError)
        setError('TURN relay settings could not be loaded; attempting a direct connection. The call may not connect on restrictive networks.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.play().catch((playbackError) => {
          setError(`Your local preview could not start: ${normalizeErrorMessage(playbackError)}`)
        })
      }

      const socket = io(socketUrl, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: Infinity,
      })

      socketRef.current = socket

      async function sendDoctorOffer() {
        if (user.role !== 'DOCTOR' || offerInProgressRef.current) return
        const peerConnection = await ensurePeerConnection()
        addLocalTracks(peerConnection, stream)
        if (peerConnection.signalingState !== 'stable') return
        offerInProgressRef.current = true
        try {
          const offer = await peerConnection.createOffer()
          await peerConnection.setLocalDescription(offer)
          socket.emit('webrtc-offer', { queueEntryId: queueEntryIdRef.current, offer })
        } finally {
          offerInProgressRef.current = false
        }
      }

      function handleSignalingFailure(signalingError) {
        console.error('WebRTC signaling failed', signalingError)
        setStatus('error')
        setError(signalingError.message || 'Unable to negotiate the audio/video connection.')
      }

      socket.on('connect', () => {
        setStatus('joining')
        socket.emit('join-consultation', { queueEntryId: queueEntryIdRef.current })
      })

      socket.on('consultation:joined', async ({ participantPresent }) => {
        try {
          setStatus('joining')
          const peerConnection = await ensurePeerConnection()
          addLocalTracks(peerConnection, stream)
          if (user.role === 'DOCTOR' && participantPresent) await sendDoctorOffer()
        } catch (signalingError) {
          handleSignalingFailure(signalingError)
        }
      })

      socket.on('consultation:participant-joined', () => {
        sendDoctorOffer().catch(handleSignalingFailure)
      })

      socket.on('webrtc-offer', async ({ offer }) => {
        try {
          const peerConnection = await ensurePeerConnection()
          addLocalTracks(peerConnection, stream)
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
          for (const pendingCandidate of pendingCandidatesRef.current.splice(0)) await peerConnection.addIceCandidate(pendingCandidate)
          const answer = await peerConnection.createAnswer()
          await peerConnection.setLocalDescription(answer)
          socket.emit('webrtc-answer', { queueEntryId: queueEntryIdRef.current, answer })
        } catch (signalingError) {
          handleSignalingFailure(signalingError)
        }
      })

      socket.on('webrtc-answer', async ({ answer }) => {
        try {
          const peerConnection = await ensurePeerConnection()
          if (peerConnection.signalingState !== 'have-local-offer') return
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
          for (const pendingCandidate of pendingCandidatesRef.current.splice(0)) await peerConnection.addIceCandidate(pendingCandidate)
        } catch (signalingError) {
          handleSignalingFailure(signalingError)
        }
      })

      socket.on('webrtc-ice-candidate', async ({ candidate }) => {
        if (!candidate) return
        try {
          const peerConnection = await ensurePeerConnection()
          const iceCandidate = new RTCIceCandidate(candidate)
          if (peerConnection.remoteDescription) await peerConnection.addIceCandidate(iceCandidate)
          else pendingCandidatesRef.current.push(iceCandidate)
        } catch (signalingError) {
          handleSignalingFailure(signalingError)
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
    localTracksAddedRef.current = false
    offerInProgressRef.current = false
    pendingCandidatesRef.current = []
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    setStatus('idle')
    setError('')
    setIsMuted(false)
    setCameraOff(false)
    setRemotePlaybackNeedsGesture(false)
  }

  async function enableRemotePlayback() {
    try {
      await remoteVideoRef.current?.play()
      setRemotePlaybackNeedsGesture(false)
    } catch (playbackError) {
      setError(normalizeErrorMessage(playbackError))
    }
  }

  function toggleMicrophone() {
    const track = streamRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setIsMuted(!track.enabled)
  }

  function toggleCamera() {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setCameraOff(!track.enabled)
  }

  if (!queueEntryId || !user) return null

  return (
    <div className="dashboard-card consultation-card">
      <h3>{roleLabel} consultation</h3>
      <p className={`realtime-status ${status === 'connected' ? 'connected' : status === 'error' ? 'error' : 'offline'}`}>Status: {status.replaceAll('-', ' ')}</p>
      {error && <p className="dashboard-error">{error}</p>}
      <div className="consultation-videos">
        <video ref={localVideoRef} autoPlay muted playsInline className="video local-video" />
        <video ref={remoteVideoRef} autoPlay playsInline className="video remote-video" />
      </div>
      {remotePlaybackNeedsGesture && <button type="button" className="queue-action" onClick={enableRemotePlayback}>Enable remote audio/video</button>}
      <div className="consultation-actions">
        {status === 'idle' && <button type="button" className="queue-action" onClick={startConsultation}>Join consultation</button>}
        {status !== 'idle' && status !== 'ended' && <><button type="button" className="queue-action" onClick={toggleMicrophone}>{isMuted ? 'Unmute' : 'Mute'}</button><button type="button" className="queue-action" onClick={toggleCamera}>{cameraOff ? 'Start camera' : 'Stop camera'}</button></>}
        {status !== 'idle' && status !== 'ended' && (
          <button type="button" className="queue-action" onClick={leaveConsultation}>Leave consultation</button>
        )}
      </div>
    </div>
  )
}

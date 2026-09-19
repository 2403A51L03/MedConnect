import { useEffect, useState } from 'react'
import { getHealth } from '../services/api.js'

export function useApiHealth() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  useEffect(() => {
    let active = true
    getHealth()
      .then((data) => active && setState({ status: 'ready', data, error: null }))
      .catch((error) => active && setState({ status: 'error', data: null, error }))
    return () => { active = false }
  }, [])

  return state
}

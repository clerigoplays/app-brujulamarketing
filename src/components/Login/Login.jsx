import { useState, useEffect } from 'react'
import { Compass, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react'
import './Login.css'

const HASH_ENV = import.meta.env.VITE_AUTH_HASH
const MAX_INTENTOS = 3
const BLOQUEO_SEGUNDOS = 30
const SESSION_KEY = 'brujula_user'
const INTENTOS_KEY = 'brujula_intentos'
const BLOQUEO_KEY = 'brujula_bloqueo'

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function Login({ onLogin }) {
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [intentos, setIntentos] = useState(0)
  const [bloqueadoHasta, setBloqueadoHasta] = useState(null)
  const [tiempoRestante, setTiempoRestante] = useState(0)
  const [loading, setLoading] = useState(false)

  // Restaurar estado de bloqueo al montar
  useEffect(() => {
    const bloqueoGuardado = sessionStorage.getItem(BLOQUEO_KEY)
    const intentosGuardados = parseInt(sessionStorage.getItem(INTENTOS_KEY) || '0')
    setIntentos(intentosGuardados)
    if (bloqueoGuardado) {
      const hasta = parseInt(bloqueoGuardado)
      if (Date.now() < hasta) {
        setBloqueadoHasta(hasta)
      } else {
        sessionStorage.removeItem(BLOQUEO_KEY)
        sessionStorage.removeItem(INTENTOS_KEY)
      }
    }
  }, [])

  // Countdown del bloqueo
  useEffect(() => {
    if (!bloqueadoHasta) return
    const interval = setInterval(() => {
      const restante = Math.ceil((bloqueadoHasta - Date.now()) / 1000)
      if (restante <= 0) {
        setBloqueadoHasta(null)
        setIntentos(0)
        setError('')
        sessionStorage.removeItem(BLOQUEO_KEY)
        sessionStorage.removeItem(INTENTOS_KEY)
        clearInterval(interval)
      } else {
        setTiempoRestante(restante)
      }
    }, 500)
    return () => clearInterval(interval)
  }, [bloqueadoHasta])

  async function handleLogin(e) {
    e.preventDefault()
    if (!usuarioSeleccionado || bloqueadoHasta) return
    setLoading(true)
    setError('')

    try {
      const hash = await hashPassword(password)
      if (hash === HASH_ENV) {
        // Éxito
        sessionStorage.setItem(SESSION_KEY, usuarioSeleccionado)
        sessionStorage.removeItem(INTENTOS_KEY)
        sessionStorage.removeItem(BLOQUEO_KEY)
        setPassword('')
        onLogin(usuarioSeleccionado)
      } else {
        // Fallo
        const nuevosIntentos = intentos + 1
        setIntentos(nuevosIntentos)
        sessionStorage.setItem(INTENTOS_KEY, String(nuevosIntentos))

        if (nuevosIntentos >= MAX_INTENTOS) {
          const hasta = Date.now() + BLOQUEO_SEGUNDOS * 1000
          setBloqueadoHasta(hasta)
          sessionStorage.setItem(BLOQUEO_KEY, String(hasta))
          setError(`Demasiados intentos. Espera ${BLOQUEO_SEGUNDOS} segundos.`)
        } else {
          setError(`Contraseña incorrecta. ${MAX_INTENTOS - nuevosIntentos} intento${MAX_INTENTOS - nuevosIntentos !== 1 ? 's' : ''} restante${MAX_INTENTOS - nuevosIntentos !== 1 ? 's' : ''}.`)
        }
        setPassword('')
      }
    } catch {
      setError('Error al verificar. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card glass-strong">
        {/* Logo */}
        <div className="login-logo">
          <Compass size={40} className="logo-icon" />
          <div>
            <h1>Brújula Marketing</h1>
            <p>Gestión Inteligente</p>
          </div>
        </div>

        {!usuarioSeleccionado ? (
          /* PASO 1: Seleccionar usuario */
          <>
            <p className="login-subtitle">¿Quién eres?</p>
            <div className="user-selector">
              <button
                className="user-option"
                onClick={() => setUsuarioSeleccionado('Andrés')}
              >
                <div className="user-avatar andres">A</div>
                <span>Andrés</span>
              </button>
              <button
                className="user-option"
                onClick={() => setUsuarioSeleccionado('Denisse')}
              >
                <div className="user-avatar denisse">D</div>
                <span>Denisse</span>
              </button>
            </div>
          </>
        ) : (
          /* PASO 2: Ingresar contraseña */
          <>
            <button
              className="login-back"
              onClick={() => { setUsuarioSeleccionado(null); setPassword(''); setError('') }}
            >
              ← Cambiar usuario
            </button>

            <div className="login-user-selected">
              <div className={`user-avatar ${usuarioSeleccionado === 'Andrés' ? 'andres' : 'denisse'}`}>
                {usuarioSeleccionado.charAt(0)}
              </div>
              <span>Hola, <strong>{usuarioSeleccionado}</strong></span>
            </div>

            <form onSubmit={handleLogin} className="login-form">
              <div className="login-input-wrap">
                <Lock size={16} className="login-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={!!bloqueadoHasta || loading}
                  autoFocus
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>

              {error && (
                <div className="login-error">
                  <AlertCircle size={14}/>
                  <span>
                    {bloqueadoHasta
                      ? `Bloqueado. Intenta en ${tiempoRestante}s`
                      : error}
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary login-btn"
                disabled={!password || !!bloqueadoHasta || loading}
              >
                {loading ? 'Verificando...' : 'Entrar'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
const API_PREFIX = '/api'

export function getToken() {
  return localStorage.getItem('token')
}

export function setToken(t) {
  if (t) localStorage.setItem('token', t)
  else localStorage.removeItem('token')
}

export function saveSession({ token, user }) {
  setToken(token)
  if (user?.name) localStorage.setItem('userName', user.name)
}

export function clearSession() {
  setToken(null)
  localStorage.removeItem('userName')
}

export function getUserName() {
  return localStorage.getItem('userName') || ''
}

export async function apiFetch(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_PREFIX}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.message || res.statusText || 'Erro na requisição'
    throw new Error(msg)
  }
  return data
}

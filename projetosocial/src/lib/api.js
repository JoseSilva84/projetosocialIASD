const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

function getApiPath(path) {
  if (!path) return API_BASE_URL
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

function getHttpErrorMessage(res, data) {
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message
  }

  if ([502, 503, 504].includes(res.status)) {
    return 'Backend indisponivel. Verifique se a API iniciou e conseguiu conectar ao MongoDB.'
  }

  if (res.status === 404) {
    return 'Rota da API nao encontrada.'
  }

  return res.statusText || 'Erro na requisicao'
}

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
  if (user?.role) localStorage.setItem('userRole', user.role)
}

export function clearSession() {
  setToken(null)
  localStorage.removeItem('userName')
  localStorage.removeItem('userRole')
  clearGroup()
}

export function getUserName() {
  return localStorage.getItem('userName') || ''
}

export function getUserRole() {
  return localStorage.getItem('userRole') || 'user'
}

export function getGroupId() {
  return localStorage.getItem('groupId')
}

export function setGroupId(id) {
  if (id) localStorage.setItem('groupId', id)
  else localStorage.removeItem('groupId')
}

export function saveGroup({ id, name }) {
  setGroupId(id)
  if (name) localStorage.setItem('groupName', name)
}

export function clearGroup() {
  setGroupId(null)
  localStorage.removeItem('groupName')
}

export function getGroupName() {
  return localStorage.getItem('groupName') || ''
}

export async function apiFetch(path, options = {}) {
  const { skipAuthRedirect = false, ...fetchOptions } = options
  const token = getToken()
  const groupId = getGroupId()
  const headers = { 'Content-Type': 'application/json', ...fetchOptions.headers }
  if (token) headers.Authorization = `Bearer ${token}`
  if (groupId) headers['x-group-id'] = groupId

  let res
  try {
    res = await fetch(getApiPath(path), { ...fetchOptions, headers })
  } catch {
    throw new Error(`Nao foi possivel conectar ao backend configurado (${API_BASE_URL}).`)
  }

  const data = await res.json().catch(() => ({}))

  if (res.status === 401) {
    const msg = getHttpErrorMessage(res, data)
    if (!skipAuthRedirect && token) {
      clearSession()
      window.location.href = '/login'
    }
    throw new Error(msg)
  }

  if (!res.ok) {
    const msg = getHttpErrorMessage(res, data)
    throw new Error(msg)
  }
  return data
}

export async function apiQuizQuestionComplete(id, { studyIndex, questionId, action }) {
  return apiFetch(`/participants/${id}/quiz-question-complete`, {
    method: 'PATCH',
    body: JSON.stringify({ studyIndex, questionId, action })
  })
}

export async function apiGetQuizChallengesStats() {
  return apiFetch('/participants/quiz-challenges-stats')
}

export async function apiGetChallenges() {
  return apiFetch('/challenges')
}

export async function apiPostChallenge(challengeData) {
  return apiFetch('/challenges', {
    method: 'POST',
    body: JSON.stringify(challengeData)
  })
}

export async function apiPutChallenge(id, challengeData) {
  return apiFetch(`/challenges/${id}`, {
    method: 'PUT',
    body: JSON.stringify(challengeData)
  })
}

export async function apiDeleteChallenge(id) {
  return apiFetch(`/challenges/${id}`, {
    method: 'DELETE'
  })
}

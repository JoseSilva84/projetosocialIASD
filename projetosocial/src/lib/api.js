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
  const token = getToken()
  const groupId = getGroupId()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers.Authorization = `Bearer ${token}`
  if (groupId) headers['x-group-id'] = groupId
  const res = await fetch(`${API_PREFIX}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))

  if (res.status === 401) {
    clearSession()
    window.location.href = '/login'
    return
  }

  if (!res.ok) {
    const msg = data.message || res.statusText || 'Erro na requisição'
    throw new Error(msg)
  }
  return data
}

export async function apiQuizQuestionComplete(id, { studyIndex, questionId, action }) {
  return apiFetch(`/participants/${id}/quiz-question-complete`, {
    method: 'PATCH',
    body: JSON.stringify({ studyIndex, questionId, action })
  });
}

export async function apiGetQuizChallengesStats() {
  return apiFetch('participants/quiz-challenges-stats');
}

// Challenge API methods
export async function apiGetChallenges() {
  return apiFetch('/challenges');
}

export async function apiPostChallenge(challengeData) {
  return apiFetch('/challenges', {
    method: 'POST',
    body: JSON.stringify(challengeData)
  });
}

export async function apiPutChallenge(id, challengeData) {
  return apiFetch(`/challenges/${id}`, {
    method: 'PUT',
    body: JSON.stringify(challengeData)
  });
}

export async function apiDeleteChallenge(id) {
  return apiFetch(`/challenges/${id}`, {
    method: 'DELETE'
  });
}

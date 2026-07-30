const SESSION_KEY = 'stl-admin-session'

function expectedToken(): string {
  const password = import.meta.env.VITE_ADMIN_PASSWORD
  if (!password) return ''
  return btoa(`stl:${password}`)
}

export function isAdminConfigured(): boolean {
  return Boolean(import.meta.env.VITE_ADMIN_PASSWORD)
}

export function isAdminAuthenticated(): boolean {
  if (!isAdminConfigured()) return false
  return sessionStorage.getItem(SESSION_KEY) === expectedToken()
}

export function verifyAdminPassword(password: string): boolean {
  const configured = import.meta.env.VITE_ADMIN_PASSWORD
  if (!configured || password !== configured) return false
  sessionStorage.setItem(SESSION_KEY, expectedToken())
  return true
}

export function clearAdminAuth(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

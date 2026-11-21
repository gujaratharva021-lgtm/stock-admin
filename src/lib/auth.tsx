import { useEffect, useState, type ReactNode } from 'react'
import { api, getToken, setToken, clearToken, type User, type LoginResponse } from './api'
import { AuthContext } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => !!getToken())

  useEffect(() => {
    if (!getToken()) return
    api
      .get<{ user: User }>('/auth/me')
      .then((res) => { const u = res.user; if (u && u.is_admin) setUser(u); else clearToken() })
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const res = await api.post<LoginResponse>('/auth/login', { email, password })
    // Admin access is enforced server-side on every admin-only endpoint
    // (a live is_admin/permission check, not this client's opinion) --
    // we still let the user in here and let the first admin API call
    // fail with a clear 403 if they genuinely lack access.
    if (!res.user.is_admin) throw new Error('This account does not have admin access')
    setToken(res.token)
    setUser(res.user)
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch {
      // revoke is best-effort; always clear the local session
    }
    clearToken()
    setUser(null)
    window.location.href = '/admin/login'
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}



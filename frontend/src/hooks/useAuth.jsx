import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)

const STORAGE_KEY = 'hub_auth'

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  })

  const value = useMemo(() => ({
    auth,
    token: auth?.token ?? null,
    user: auth?.user ?? null,
    permissions: auth?.user?.permissions ?? [],
    isAuthenticated: Boolean(auth?.token),
    hasPermission(permission) {
      return Boolean(auth?.user?.permissions?.includes(permission))
    },
    updateUser(userData) {
      setAuth((current) => {
        if (!current) return current
        const next = { ...current, user: { ...current.user, ...userData } }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      })
    },
    login(data) {
      setAuth(data)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    },
    logout() {
      setAuth(null)
      localStorage.removeItem(STORAGE_KEY)
    }
  }), [auth])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}

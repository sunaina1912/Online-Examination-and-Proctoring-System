import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id:    string
      name?: string | null
      email?: string | null
      image?: string | null
      role:  'student' | 'admin' | 'examiner'
    }
  }

  interface User {
    id:   string
    role: 'student' | 'admin' | 'examiner'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id:   string
    role: 'student' | 'admin' | 'examiner'
  }
}

export type ProfileRole = 'owner' | 'user'

export type SessionProfile = {
  id: string
  email: string
  fullName: string | null
  role: ProfileRole
}
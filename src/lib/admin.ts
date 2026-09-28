import { doc, getDoc } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from './firebase'

export type AdminRole = 'super_admin' | 'school_admin'

export interface AdminRecord {
  role: AdminRole
  active: boolean
  schoolId?: string
  displayName?: string
  email?: string
}

export async function resolveAdminAccess(user: User): Promise<AdminRecord | null> {
  const snap = await getDoc(doc(db, 'admins', user.uid))
  if (!snap.exists()) return null
  const data = snap.data() as Partial<AdminRecord>
  if (data.active === false) return null
  if (data.role !== 'super_admin' && data.role !== 'school_admin') return null
  return {
    role: data.role,
    active: true,
    schoolId: data.schoolId,
    displayName: data.displayName,
    email: data.email,
  }
}
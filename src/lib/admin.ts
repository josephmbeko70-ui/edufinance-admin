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
  const ref = doc(db, 'admins', user.uid)
  const snap = await getDoc(ref)

  console.log('[EduFinance Admin] Vérification:', `admins/${user.uid}`)
  console.log('[EduFinance Admin] Document existe:', snap.exists())

  if (!snap.exists()) return null

  const data = snap.data()

  console.log('[EduFinance Admin] role:', data.role)
  console.log('[EduFinance Admin] active:', data.active)
  console.log('[EduFinance Admin] active type:', typeof data.active)

  // Sécurité stricte : active doit être le Boolean true.
  if (data.active !== true) return null

  if (data.role !== 'super_admin' && data.role !== 'school_admin') {
    return null
  }

  return {
    role: data.role,
    active: true,
    schoolId: data.schoolId,
    displayName: data.displayName,
    email: data.email,
  }
}

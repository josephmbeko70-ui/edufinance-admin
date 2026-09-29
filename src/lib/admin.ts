import { doc, getDocFromServer } from 'firebase/firestore'
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
  const path = `admins/${user.uid}`
  const ref = doc(db, 'admins', user.uid)

  console.log('[EduFinance Admin][RBAC] Vérification Firestore:', {
    path,
    uid: user.uid,
    email: user.email,
  })

  try {
    // Lecture serveur volontairement utilisée ici pour éviter qu'un cache
    // local masque un problème de règles ou de données.
    const snap = await getDocFromServer(ref)

    console.log('[EduFinance Admin][RBAC] Document existe:', snap.exists())

    if (!snap.exists()) {
      console.error('[EduFinance Admin][RBAC] DOCUMENT ADMIN ABSENT:', path)
      return null
    }

    const data = snap.data()

    console.log('[EduFinance Admin][RBAC] Données brutes:', {
      role: data.role ?? null,
      active: data.active ?? null,
      activeType: typeof data.active,
      activeIsTrue: data.active === true,
      roleIsSuperAdmin: data.role === 'super_admin',
      keys: Object.keys(data),
    })

    if (data.active !== true) {
      console.error('[EduFinance Admin][RBAC] REFUS: active !== true')
      return null
    }

    if (data.role !== 'super_admin' && data.role !== 'school_admin') {
      console.error('[EduFinance Admin][RBAC] REFUS: rôle invalide:', data.role)
      return null
    }

    return {
      role: data.role,
      active: true,
      schoolId: data.schoolId,
      displayName: data.displayName,
      email: data.email,
    }
  } catch (error) {
    console.error('[EduFinance Admin][RBAC] ERREUR FIRESTORE:', {
      path,
      error,
      message: error instanceof Error ? error.message : String(error),
      code: typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : null,
    })

    throw error
  }
}

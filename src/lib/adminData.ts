import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  query,
  orderBy,
  limit,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'

export type SchoolRecord = Record<string, any> & { id: string }
export type AdminRecordData = Record<string, any> & { id: string }

export async function listSchools(schoolId?: string): Promise<SchoolRecord[]> {
  if (schoolId) {
    const snap = await getDoc(doc(db, 'schools', schoolId))
    return snap.exists() ? [{ id: snap.id, ...snap.data() }] : []
  }

  const snap = await getDocs(query(collection(db, 'schools'), orderBy('name', 'asc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function listAdmins(): Promise<AdminRecordData[]> {
  const snap = await getDocs(query(collection(db, 'admins'), orderBy('displayName', 'asc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getPlatformCounts(schoolId?: string) {
  if (schoolId) {
    const schoolSnap = await getDoc(doc(db, 'schools', schoolId))
    const school = schoolSnap.exists() ? schoolSnap.data() : null

    return {
      schools: school ? 1 : 0,
      admins: school ? 1 : 0,
      activeSchools: school?.status === 'active' ? 1 : 0,
      pendingSchools: school?.status === 'pending' ? 1 : 0,
      rejectedSchools: school?.status === 'rejected' ? 1 : 0,
      activeAdmins: school?.status === 'active' ? 1 : 0,
    }
  }

  const [schools, admins, activeSchools, pendingSchools, rejectedSchools, activeAdmins] = await Promise.all([
    getCountFromServer(collection(db, 'schools')),
    getCountFromServer(collection(db, 'admins')),
    getCountFromServer(query(collection(db, 'schools'), where('status', '==', 'active'))),
    getCountFromServer(query(collection(db, 'schools'), where('status', '==', 'pending'))),
    getCountFromServer(query(collection(db, 'schools'), where('status', '==', 'rejected'))),
    getCountFromServer(query(collection(db, 'admins'), where('active', '==', true))),
  ])

  return {
    schools: schools.data().count,
    admins: admins.data().count,
    activeSchools: activeSchools.data().count,
    pendingSchools: pendingSchools.data().count,
    rejectedSchools: rejectedSchools.data().count,
    activeAdmins: activeAdmins.data().count,
  }
}

export async function getSchoolStats(schoolId: string) {
  const [students, payments, charges, cashOperations, auditLogs, users] = await Promise.all([
    getCountFromServer(collection(db, 'schools', schoolId, 'students')),
    getCountFromServer(collection(db, 'schools', schoolId, 'payments')),
    getCountFromServer(collection(db, 'schools', schoolId, 'studentCharges')),
    getCountFromServer(collection(db, 'schools', schoolId, 'cashOperations')),
    getCountFromServer(collection(db, 'schools', schoolId, 'auditLogs')),
    getCountFromServer(collection(db, 'schools', schoolId, 'users')),
  ])

  return {
    students: students.data().count,
    payments: payments.data().count,
    charges: charges.data().count,
    cashOperations: cashOperations.data().count,
    auditLogs: auditLogs.data().count,
    users: users.data().count,
  }
}

export async function listSchoolUsers(schoolId: string): Promise<Record<string, any>[]> {
  const snap = await getDocs(query(collection(db, 'schools', schoolId, 'users'), orderBy('displayName', 'asc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function listSchoolPayments(schoolId: string): Promise<Record<string, any>[]> {
  const snap = await getDocs(query(collection(db, 'schools', schoolId, 'payments'), orderBy('createdAt', 'desc'), limit(100)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function listSchoolActivity(schoolId: string): Promise<Record<string, any>[]> {
  const snap = await getDocs(query(collection(db, 'schools', schoolId, 'auditLogs'), orderBy('createdAt', 'desc'), limit(100)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function setSchoolStatus(schoolId: string, status: 'active' | 'rejected' | 'pending') {
  const schoolSnap = await getDoc(doc(db, 'schools', schoolId))
  if (!schoolSnap.exists()) {
    throw new Error('Établissement introuvable.')
  }

  const school = schoolSnap.data()
  const ownerId = typeof school.ownerId === 'string' ? school.ownerId : ''
  if (!ownerId) {
    throw new Error('ownerId manquant sur l’établissement.')
  }

  const now = new Date().toISOString()
  const batch = writeBatch(db)

  batch.update(doc(db, 'schools', schoolId), {
    status,
    updatedAt: now,
    ...(status === 'active'
      ? { approvedAt: now }
      : status === 'rejected'
        ? { rejectedAt: now }
        : {}),
  })

  const linkRef = doc(db, 'userSchoolLinks', ownerId)
  batch.set(
    linkRef,
    {
      schoolId,
      status,
      updatedAt: now,
    },
    { merge: true }
  )

  const adminRef = doc(db, 'admins', ownerId)

  if (status === 'active') {
    batch.set(
      adminRef,
      {
        role: 'school_admin',
        active: true,
        schoolId,
        email: school.ownerEmail || school.email || '',
        displayName: school.ownerName || '',
        updatedAt: now,
        createdAt: schoolSnap.data().createdAt || now,
      },
      { merge: true }
    )
  } else if (status === 'rejected') {
    const adminSnap = await getDoc(adminRef)
    if (adminSnap.exists()) {
      const existing = adminSnap.data()
      if (existing.role === 'school_admin' && existing.schoolId === schoolId) {
        batch.update(adminRef, {
          active: false,
          updatedAt: now,
        })
      }
    }
  }

  await batch.commit()
}

export async function setAdminActive(adminId: string, active: boolean) {
  await updateDoc(doc(db, 'admins', adminId), { active })
}

export async function setAdminRole(adminId: string, role: 'super_admin' | 'school_admin') {
  await updateDoc(doc(db, 'admins', adminId), { role })
}

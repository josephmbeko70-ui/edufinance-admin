import {
  collection,
  doc,
  getDocs,
  getCountFromServer,
  query,
  orderBy,
  limit,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase'

export type SchoolRecord = Record<string, any> & { id: string }
export type AdminRecordData = Record<string, any> & { id: string }

export async function listSchools(): Promise<SchoolRecord[]> {
  const snap = await getDocs(query(collection(db, 'schools'), orderBy('name', 'asc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function listAdmins(): Promise<AdminRecordData[]> {
  const snap = await getDocs(query(collection(db, 'admins'), orderBy('displayName', 'asc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getPlatformCounts() {
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
  await updateDoc(doc(db, 'schools', schoolId), { status, updatedAt: new Date().toISOString() })
}

export async function setAdminActive(adminId: string, active: boolean) {
  await updateDoc(doc(db, 'admins', adminId), { active })
}

export async function setAdminRole(adminId: string, role: 'super_admin' | 'school_admin') {
  await updateDoc(doc(db, 'admins', adminId), { role })
}

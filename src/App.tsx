import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, Building2, CreditCard, LayoutDashboard, LogOut, Menu, Settings,
  ShieldCheck, UserRound, Users, X, Search, Bell, ChevronRight, WalletCards,
  GraduationCap, RefreshCw, Power, UserCog, Database, ArrowUpRight
} from 'lucide-react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { auth } from './lib/firebase'
import { resolveAdminAccess, type AdminRecord } from './lib/admin'
import {
  getPlatformCounts,
  getSchoolStats,
  listAdmins,
  listSchoolActivity,
  listSchoolPayments,
  listSchoolUsers,
  listSchools,
  setAdminActive,
  setAdminRole,
  type AdminRecordData,
  type SchoolRecord,
} from './lib/adminData'

type Page = 'dashboard' | 'schools' | 'admins' | 'subscriptions' | 'payments' | 'users' | 'activity' | 'settings'
type IconType = typeof Building2

const CLIENT_APP_URL = 'https://josephmbeko70-ui.github.io/edufinance/'

const nav: { id: Page; label: string; icon: IconType }[] = [
  { id: 'dashboard', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { id: 'schools', label: 'Établissements', icon: Building2 },
  { id: 'admins', label: 'Administrateurs', icon: ShieldCheck },
  { id: 'subscriptions', label: 'Abonnements', icon: WalletCards },
  { id: 'payments', label: 'Paiements', icon: CreditCard },
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'activity', label: 'Activité / Journal', icon: Activity },
  { id: 'settings', label: 'Paramètres', icon: Settings },
]

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [admin, setAdmin] = useState<AdminRecord | null>(null)
  const [booting, setBooting] = useState(true)
  const [page, setPage] = useState<Page>('dashboard')
  const [open, setOpen] = useState(false)
  const [authState, setAuthState] = useState('Initialisation Firebase…')

  useEffect(() => {
    let mounted = true

    // IMPORTANT :
    // Firebase peut avoir besoin de terminer la restauration de la
    // persistance locale avant que l'application Admin ne puisse connaître
    // l'utilisateur. On attend explicitement que l'état initial soit prêt.
    const boot = async () => {
      try {
        setAuthState('Restauration de la session Firebase…')
        await auth.authStateReady()

        if (!mounted) return

        console.log('[EduFinance Admin][AUTH DEBUG]', {
          origin: window.location.origin,
          path: window.location.pathname,
          firebaseAppName: auth.app.name,
          projectId: auth.app.options.projectId,
          appId: auth.app.options.appId,
          apiKey: auth.app.options.apiKey,
          currentUserUid: auth.currentUser?.uid ?? null,
          currentUserEmail: auth.currentUser?.email ?? null,
        })

        const restoredUser = auth.currentUser

        if (!restoredUser) {
          setUser(null)
          setAdmin(null)
          setAuthState('Aucune session Firebase détectée.')
          setBooting(false)
          window.location.replace(CLIENT_APP_URL)
          return
        }

        setUser(restoredUser)
        setAuthState(`Session détectée : ${restoredUser.email || restoredUser.uid}`)

        const access = await resolveAdminAccess(restoredUser)
        if (!mounted) return

        if (!access) {
          setAdmin(null)
          setBooting(false)
          try { await signOut(auth) } catch {}
          window.location.replace(CLIENT_APP_URL)
          return
        }

        setAdmin(access)
        setBooting(false)
      } catch (error) {
        console.error('[EduFinance Admin] Erreur de restauration/vérification:', error)
        if (!mounted) return
        setUser(null)
        setAdmin(null)
        setAuthState('Impossible de restaurer la session Firebase.')
        setBooting(false)
        window.location.replace(CLIENT_APP_URL)
      }
    }

    boot()

    const unsubscribe = onAuthStateChanged(auth, next => {
      if (!mounted) return

      // Une fois le boot initial terminé, ce listener sert uniquement à
      // maintenir l'état local. Il ne provoque pas de redirection pendant
      // la restauration initiale.
      if (!booting) {
        setUser(next)
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  if (booting) return <Loading text={authState || "Vérification des accès administrateur…"} />
  if (!user || !admin) return <Loading text={authState || "Session administrateur absente. Retour vers EduFinance Pro…"} />

  const isSuperAdmin = admin.role === 'super_admin'
  const visibleNav = isSuperAdmin ? nav : nav.filter(item => ['dashboard', 'schools', 'users', 'payments', 'activity', 'settings'].includes(item.id))

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 bg-slate-950 text-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div>
            <p className="text-lg font-semibold tracking-tight">EduFinance</p>
            <p className="text-xs text-slate-400">Console centrale</p>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X size={20}/></button>
        </div>

        <nav className="space-y-1 p-4">
          {visibleNav.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => { setPage(item.id); setOpen(false) }}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${page === item.id ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
              >
                <Icon size={18}/>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><UserRound size={17}/></div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{admin.displayName || user.email || 'Administrateur'}</p>
              <p className="text-xs capitalize text-slate-400">{admin.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="mt-3 flex items-center gap-2 text-xs text-slate-300 hover:text-white">
            <LogOut size={14}/> Déconnexion
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
          <div className="flex h-20 items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-3">
              <button className="lg:hidden" onClick={() => setOpen(true)}><Menu size={22}/></button>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">EduFinance Admin</p>
                <h1 className="text-xl font-semibold">{visibleNav.find(x => x.id === page)?.label || 'Console'}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 md:inline-flex">Accès sécurisé</span>
              <div className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white">
                <Bell size={18}/>
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500"/>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">
          {page === 'dashboard' && <Dashboard onNavigate={setPage}/>}
          {page === 'schools' && <SchoolsPage />}
          {page === 'admins' && isSuperAdmin && <AdminsPage currentUid={user.uid}/>}
          {page === 'subscriptions' && isSuperAdmin && <SubscriptionsPage />}
          {page === 'payments' && <SchoolScopedPage type="payments" />}
          {page === 'users' && <SchoolScopedPage type="users" />}
          {page === 'activity' && <SchoolScopedPage type="activity" />}
          {page === 'settings' && <SettingsPage admin={admin} user={user}/>}
        </main>
      </div>
    </div>
  )
}

function Dashboard({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [counts, setCounts] = useState({ schools: 0, admins: 0, activeSchools: 0, activeAdmins: 0 })
  const [schools, setSchools] = useState<SchoolRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [platformCounts, schoolList] = await Promise.all([getPlatformCounts(), listSchools()])
      setCounts(platformCounts)
      setSchools(schoolList)
    } catch (error) {
      console.error('[Admin Dashboard]', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-slate-500">Pilotage global de la plateforme</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Vue d’ensemble</h2>
        </div>
        <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-50">
          <RefreshCw size={16}/> Actualiser
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Établissements" value={counts.schools} hint={`${counts.activeSchools} actifs`} icon={Building2}/>
        <StatCard label="Administrateurs" value={counts.admins} hint={`${counts.activeAdmins} actifs`} icon={ShieldCheck}/>
        <StatCard label="Base scolaire" value="À la demande" hint="Statistiques détaillées par établissement" icon={GraduationCap}/>
        <StatCard label="Sécurité" value="Active" hint="Firebase Auth + RBAC Firestore" icon={Database}/>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Établissements récents" subtitle="Données provenant directement de Firestore.">
          {loading ? <InlineLoading/> : schools.length === 0 ? <Empty icon={Building2} text="Aucun établissement enregistré."/> : (
            <div className="divide-y divide-slate-100">
              {schools.slice(0, 6).map(school => (
                <button key={school.id} onClick={() => onNavigate('schools')} className="flex w-full items-center justify-between gap-4 py-4 text-left hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{school.name || school.id}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{[school.city, school.province].filter(Boolean).join(' · ') || 'Localisation non renseignée'}</p>
                  </div>
                  <StatusBadge value={school.status}/>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Accès administrateur" subtitle="État du contrôle RBAC.">
          <div className="space-y-3">
            <InfoRow label="Authentification" value="Firebase Authentication"/>
            <InfoRow label="Autorisation" value="admins/{uid}"/>
            <InfoRow label="Rôle global" value="super_admin"/>
            <InfoRow label="Connexion admin" value="Depuis EduFinance Pro"/>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <QuickAction icon={Building2} title="Établissements" text="Consulter les écoles et leurs statistiques." onClick={() => onNavigate('schools')}/>
        <QuickAction icon={UserCog} title="Administrateurs" text="Gérer les comptes administrateurs." onClick={() => onNavigate('admins')}/>
        <QuickAction icon={Activity} title="Journal" text="Consulter l’activité d’un établissement." onClick={() => onNavigate('activity')}/>
      </div>
    </div>
  )
}

function SchoolsPage() {
  const [schools, setSchools] = useState<SchoolRecord[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<SchoolRecord | null>(null)
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setSchools(await listSchools()) } catch (error) { console.error(error) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return schools
    return schools.filter(s => JSON.stringify(s).toLowerCase().includes(term))
  }, [schools, search])

  const openSchool = async (school: SchoolRecord) => {
    setSelected(school)
    setStats(null)
    setStatsLoading(true)
    try { setStats(await getSchoolStats(school.id)) } catch (error) { console.error(error) } finally { setStatsLoading(false) }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Établissements" subtitle="Gestion et supervision des espaces scolaires." onRefresh={load} loading={loading}/>
      <div className="relative max-w-xl">
        <Search size={17} className="absolute left-3 top-3.5 text-slate-400"/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un établissement…" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none focus:border-slate-400"/>
      </div>

      <Panel title={`${filtered.length} établissement(s)`} subtitle="Les données sont lues à la demande depuis Firestore.">
        {loading ? <InlineLoading/> : filtered.length === 0 ? <Empty icon={Building2} text="Aucun établissement trouvé."/> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3">Établissement</th><th className="px-3 py-3">Ville</th><th className="px-3 py-3">Année</th><th className="px-3 py-3">Statut</th><th className="px-3 py-3"></th>
              </tr></thead>
              <tbody>
                {filtered.map(s => <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-4"><p className="font-medium">{s.name || s.id}</p><p className="mt-1 text-xs text-slate-400">{s.id}</p></td>
                  <td className="px-3 py-4 text-slate-600">{s.city || '—'}</td>
                  <td className="px-3 py-4 text-slate-600">{s.schoolYear || '—'}</td>
                  <td className="px-3 py-4"><StatusBadge value={s.status}/></td>
                  <td className="px-3 py-4 text-right"><button onClick={() => openSchool(s)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-white">Détails <ArrowUpRight size={13} className="ml-1 inline"/></button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {selected && (
        <Panel title={selected.name || selected.id} subtitle="Statistiques calculées à la demande pour cet établissement.">
          {statsLoading ? <InlineLoading/> : stats ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MiniStat icon={GraduationCap} label="Élèves" value={stats.students}/>
              <MiniStat icon={CreditCard} label="Paiements" value={stats.payments}/>
              <MiniStat icon={WalletCards} label="Charges" value={stats.charges}/>
              <MiniStat icon={Database} label="Opérations caisse" value={stats.cashOperations}/>
              <MiniStat icon={Users} label="Utilisateurs" value={stats.users}/>
              <MiniStat icon={Activity} label="Logs d’audit" value={stats.auditLogs}/>
            </div>
          ) : <Empty icon={Database} text="Statistiques indisponibles."/>}
        </Panel>
      )}
    </div>
  )
}

function AdminsPage({ currentUid }: { currentUid: string }) {
  const [admins, setAdmins] = useState<AdminRecordData[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setAdmins(await listAdmins()) } catch (error) { console.error(error) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return term ? admins.filter(a => JSON.stringify(a).toLowerCase().includes(term)) : admins
  }, [admins, search])

  const toggleActive = async (item: AdminRecordData) => {
    if (item.id === currentUid) return
    setBusy(item.id)
    try {
      await setAdminActive(item.id, item.active !== true)
      await load()
    } catch (error) {
      console.error(error)
      alert('Impossible de modifier cet administrateur.')
    } finally { setBusy(null) }
  }

  const changeRole = async (item: AdminRecordData) => {
    if (item.id === currentUid) return
    const next = item.role === 'super_admin' ? 'school_admin' : 'super_admin'
    setBusy(item.id)
    try {
      await setAdminRole(item.id, next)
      await load()
    } catch (error) {
      console.error(error)
      alert('Impossible de modifier le rôle.')
    } finally { setBusy(null) }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Administrateurs" subtitle="Gestion des comptes autorisés à accéder à la console." onRefresh={load} loading={loading}/>
      <div className="relative max-w-xl">
        <Search size={17} className="absolute left-3 top-3.5 text-slate-400"/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un administrateur…" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none focus:border-slate-400"/>
      </div>
      <Panel title={`${filtered.length} administrateur(s)`} subtitle="Le champ active doit rester un Boolean true/false dans Firestore.">
        {loading ? <InlineLoading/> : filtered.length === 0 ? <Empty icon={ShieldCheck} text="Aucun administrateur trouvé."/> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3">Administrateur</th><th className="px-3 py-3">Rôle</th><th className="px-3 py-3">Établissement</th><th className="px-3 py-3">Statut</th><th className="px-3 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody>{filtered.map(a => <tr key={a.id} className="border-b border-slate-50 last:border-0">
                <td className="px-3 py-4"><p className="font-medium">{a.displayName || a.email || a.id}</p><p className="mt-1 text-xs text-slate-400">{a.email || a.id}</p></td>
                <td className="px-3 py-4"><RoleBadge role={a.role}/></td>
                <td className="px-3 py-4 text-slate-600">{a.schoolId || 'Global'}</td>
                <td className="px-3 py-4"><StatusBadge value={a.active === true ? 'active' : 'inactive'}/></td>
                <td className="px-3 py-4 text-right">
                  {a.id === currentUid ? <span className="text-xs text-slate-400">Compte actuel</span> : <div className="flex justify-end gap-2">
                    <button disabled={busy === a.id} onClick={() => toggleActive(a)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium disabled:opacity-50"><Power size={13} className="mr-1 inline"/> {a.active === true ? 'Désactiver' : 'Activer'}</button>
                    <button disabled={busy === a.id} onClick={() => changeRole(a)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium disabled:opacity-50"><UserCog size={13} className="mr-1 inline"/> Changer rôle</button>
                  </div>}
                </td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}

function SchoolScopedPage({ type }: { type: 'payments' | 'users' | 'activity' }) {
  const [schools, setSchools] = useState<SchoolRecord[]>([])
  const [schoolId, setSchoolId] = useState('')
  const [rows, setRows] = useState<Record<string, any>[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    listSchools().then(data => {
      setSchools(data)
      if (data[0]) setSchoolId(data[0].id)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (!schoolId) return
    setLoading(true)
    const load = type === 'payments' ? listSchoolPayments(schoolId) : type === 'users' ? listSchoolUsers(schoolId) : listSchoolActivity(schoolId)
    load.then(setRows).catch(error => { console.error(error); setRows([]) }).finally(() => setLoading(false))
  }, [schoolId, type])

  const meta = {
    payments: { title: 'Paiements', subtitle: 'Paiements enregistrés dans l’établissement sélectionné.', icon: CreditCard },
    users: { title: 'Utilisateurs', subtitle: 'Utilisateurs de l’établissement sélectionné.', icon: Users },
    activity: { title: 'Activité / Journal', subtitle: 'Journal d’audit de l’établissement sélectionné.', icon: Activity },
  }[type]
  const Icon = meta.icon

  return (
    <div className="space-y-6">
      <PageHeader title={meta.title} subtitle={meta.subtitle}/>
      <div className="max-w-xl">
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">Établissement</label>
        <select value={schoolId} onChange={e => setSchoolId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none">
          {schools.length === 0 && <option value="">Aucun établissement</option>}
          {schools.map(s => <option key={s.id} value={s.id}>{s.name || s.id}</option>)}
        </select>
      </div>
      <Panel title={`${rows.length} élément(s)`} subtitle="Chargement limité aux 100 éléments les plus récents lorsque la collection est paginée.">
        {loading ? <InlineLoading/> : rows.length === 0 ? <Empty icon={Icon} text="Aucune donnée disponible pour cet établissement."/> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                {type === 'payments' && <><th className="px-3 py-3">Élève</th><th className="px-3 py-3">Montant</th><th className="px-3 py-3">Méthode</th><th className="px-3 py-3">Date</th></>}
                {type === 'users' && <><th className="px-3 py-3">Utilisateur</th><th className="px-3 py-3">Rôle</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Statut</th></>}
                {type === 'activity' && <><th className="px-3 py-3">Action</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Utilisateur</th><th className="px-3 py-3">Date</th></>}
              </tr></thead>
              <tbody>{rows.map(row => <tr key={row.id} className="border-b border-slate-50 last:border-0">
                {type === 'payments' && <><td className="px-3 py-4 font-medium">{row.studentName || row.matricule || '—'}</td><td className="px-3 py-4">{formatMoney(row.amount, row.currency)}</td><td className="px-3 py-4">{row.paymentMethod || '—'}</td><td className="px-3 py-4">{formatDate(row.createdAt || row.paymentDate)}</td></>}
                {type === 'users' && <><td className="px-3 py-4 font-medium">{row.displayName || row.email || row.id}</td><td className="px-3 py-4">{row.role || '—'}</td><td className="px-3 py-4">{row.email || '—'}</td><td className="px-3 py-4"><StatusBadge value={row.active === true ? 'active' : 'inactive'}/></td></>}
                {type === 'activity' && <><td className="px-3 py-4 font-medium">{row.action || '—'}</td><td className="px-3 py-4">{row.entityType || '—'}</td><td className="px-3 py-4">{row.userEmail || row.userId || '—'}</td><td className="px-3 py-4">{formatDate(row.createdAt)}</td></>}
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}

function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Abonnements" subtitle="Structure de facturation de la plateforme."/>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        La console affiche actuellement les plans, mais aucune collection Firestore « subscriptions » n’est autorisée dans les règles actuelles. Le stockage et la facturation réelle seront branchés séparément, sans inventer de données.
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <PlanCard name="Classique" price="$1 / élève"/>
        <PlanCard name="Professionnel" price="$1.50 / élève"/>
        <PlanCard name="Établissement" price="$2 / élève"/>
      </div>
    </div>
  )
}

function SettingsPage({ admin, user }: { admin: AdminRecord; user: User }) {
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Paramètres" subtitle="Informations techniques et sécurité de la console."/>
      <Panel title="Sécurité" subtitle="État de la session et du modèle d’autorisation.">
        <div className="space-y-4">
          <InfoRow label="Compte connecté" value={user.email || user.uid}/>
          <InfoRow label="UID" value={user.uid}/>
          <InfoRow label="Rôle" value={admin.role}/>
          <InfoRow label="Projet Firebase" value="edufinance-e0fd5"/>
          <InfoRow label="Authentification" value="EduFinance Pro → session Firebase partagée"/>
          <InfoRow label="Autorisation" value="admins/{uid} + active === true"/>
        </div>
      </Panel>
      <Panel title="Principe de fonctionnement" subtitle="La console ne possède pas de formulaire de connexion indépendant.">
        <div className="space-y-3 text-sm text-slate-600">
          <p>1. L’utilisateur se connecte dans EduFinance Pro.</p>
          <p>2. Pro vérifie le document <code className="rounded bg-slate-100 px-1.5 py-0.5">admins/{user.uid}</code>.</p>
          <p>3. Un <code className="rounded bg-slate-100 px-1.5 py-0.5">super_admin</code> actif est envoyé automatiquement vers cette console.</p>
          <p>4. Une session non autorisée est renvoyée vers EduFinance Pro.</p>
        </div>
      </Panel>
    </div>
  )
}

function PageHeader({ title, subtitle, onRefresh, loading }: { title: string; subtitle: string; onRefresh?: () => void; loading?: boolean }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div><p className="text-sm text-slate-500">{subtitle}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2></div>
      {onRefresh && <button onClick={onRefresh} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> Actualiser</button>}
    </div>
  )
}

function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint: string; icon: IconType }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><Icon size={19}/></div><p className="mt-5 text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-semibold">{value}</p><p className="mt-2 text-xs text-slate-400">{hint}</p></div>
}

function MiniStat({ icon: Icon, label, value }: { icon: IconType; label: string; value: number }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-center gap-2 text-xs text-slate-500"><Icon size={15}/>{label}</div><p className="mt-2 text-2xl font-semibold">{value}</p></div>
}

function QuickAction({ icon: Icon, title, text, onClick }: { icon: IconType; title: string; text: string; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-slate-300"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white"><Icon size={18}/></div><p className="mt-4 font-semibold">{title}</p><p className="mt-1 text-sm text-slate-500">{text}</p></button>
}

function PlanCard({ name, price }: { name: string; price: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft"><p className="text-sm text-slate-500">{name}</p><p className="mt-3 text-3xl font-semibold">{price}</p><div className="mt-6 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Plan configuré — stockage des abonnements à connecter.</div></div>
}

function RoleBadge({ role }: { role: string }) {
  return <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{role === 'super_admin' ? 'Super admin' : 'School admin'}</span>
}

function StatusBadge({ value }: { value?: string }) {
  const active = value === 'active'
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{active ? 'Actif' : value || 'Non renseigné'}</span>
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-col gap-1 border-b border-slate-100 pb-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm text-slate-500">{label}</span><span className="break-all text-sm font-medium">{value}</span></div>
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"><div className="mb-5 flex items-start justify-between gap-4"><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><ChevronRight size={18} className="text-slate-300"/></div>{children}</section>
}

function Empty({ icon: Icon, text }: { icon: IconType; text: string }) {
  return <div className="flex flex-col items-center justify-center py-12 text-center"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Icon size={20}/></div><p className="mt-4 text-sm text-slate-500">{text}</p></div>
}

function InlineLoading() {
  return <div className="flex items-center justify-center py-12 text-sm text-slate-400"><RefreshCw size={17} className="mr-2 animate-spin"/> Chargement…</div>
}

function Loading({ text }: { text: string }) {
  return <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-300"><div className="text-center"><RefreshCw size={28} className="mx-auto animate-spin text-indigo-400"/><p className="mt-4 text-sm">{text}</p></div></div>
}

function formatDate(value: any) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('fr-FR')
}

function formatMoney(value: any, currency?: string) {
  if (typeof value !== 'number') return '—'
  return `${value.toLocaleString('fr-FR')} ${currency || 'CDF'}`
}

export default App

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Activity, ArrowDownToLine, ArrowUpRight, Bell, Building2, ChevronDown, ChevronRight,
  CircleDollarSign, CreditCard, Database, FileBarChart, Gauge, GraduationCap,
  LayoutDashboard, LogOut, Menu, MoreHorizontal, Percent, Power, RefreshCw,
  Search, Settings, ShieldCheck, Sparkles, TrendingDown, TrendingUp, UserCog,
  UserRound, Users, WalletCards, X
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

const navGroups: { label: string; items: { id: Page; label: string; icon: IconType }[] }[] = [
  {
    label: 'Pilotage',
    items: [
      { id: 'dashboard', label: 'Vue d’ensemble', icon: LayoutDashboard },
      { id: 'schools', label: 'Établissements', icon: Building2 },
    ],
  },
  {
    label: 'Finance & opérations',
    items: [
      { id: 'payments', label: 'Finances', icon: CircleDollarSign },
      { id: 'users', label: 'Utilisateurs', icon: Users },
      { id: 'activity', label: 'Activité', icon: Activity },
    ],
  },
  {
    label: 'Administration',
    items: [
      { id: 'admins', label: 'Administrateurs', icon: ShieldCheck },
      { id: 'subscriptions', label: 'Abonnements', icon: WalletCards },
      { id: 'settings', label: 'Paramètres', icon: Settings },
    ],
  },
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
    let verifying = false
    let authReady = false
    let unsubscribe: (() => void) | null = null

    const verifyUser = async (nextUser: User | null) => {
      if (!mounted || verifying) return

      if (!nextUser) {
        if (!authReady) return

        console.warn('[EduFinance Admin][AUTH] Aucune session Firebase après restauration.')
        setUser(null)
        setAdmin(null)
        setAuthState('Aucune session Firebase détectée. Retour vers EduFinance Pro…')
        setBooting(false)
        window.location.replace(CLIENT_APP_URL)
        return
      }

      verifying = true
      setUser(nextUser)
      setAuthState(`Session détectée : ${nextUser.email || nextUser.uid}`)

      console.log('[EduFinance Admin][AUTH DEBUG]', {
        origin: window.location.origin,
        path: window.location.pathname,
        firebaseAppName: auth.app.name,
        projectId: auth.app.options.projectId,
        appId: auth.app.options.appId,
        apiKey: auth.app.options.apiKey,
        currentUserUid: auth.currentUser?.uid ?? null,
        currentUserEmail: auth.currentUser?.email ?? null,
        restoredUserUid: nextUser.uid,
        restoredUserEmail: nextUser.email ?? null,
        emailVerified: nextUser.emailVerified,
        isAnonymous: nextUser.isAnonymous,
      })

      try {
        const access = await resolveAdminAccess(nextUser)

        if (!mounted) return

        if (!access) {
          console.error(
            '[EduFinance Admin][AUTH] Utilisateur Firebase détecté, mais aucun accès admin valide.'
          )
          setAdmin(null)
          setAuthState('DIAGNOSTIC : session Firebase présente, mais accès admins/{uid} refusé. La redirection est volontairement suspendue.')
          setBooting(false)
          return
        }

        console.log('[EduFinance Admin][AUTH] Accès administrateur validé:', access)
        setAdmin(access)
        setAuthState(`Accès administrateur validé : ${access.role}`)
        setBooting(false)
      } catch (error) {
        console.error(
          '[EduFinance Admin][AUTH] Erreur Firestore pendant la vérification admins:',
          error
        )

        if (!mounted) return

        setAdmin(null)
        setAuthState('DIAGNOSTIC : erreur pendant la lecture de admins/{uid}. La redirection est volontairement suspendue.')
        setBooting(false)
      } finally {
        verifying = false
      }
    }

    const boot = async () => {
      try {
        setAuthState('Restauration de la session Firebase…')

        await auth.authStateReady()

        if (!mounted) return

        authReady = true

        console.log('[EduFinance Admin][AUTH] authStateReady terminé:', {
          currentUserUid: auth.currentUser?.uid ?? null,
          currentUserEmail: auth.currentUser?.email ?? null,
        })

        await verifyUser(auth.currentUser)

        if (!mounted) return

        unsubscribe = onAuthStateChanged(auth, nextUser => {
          console.log('[EduFinance Admin][AUTH STATE CHANGED]', {
            uid: nextUser?.uid ?? null,
            email: nextUser?.email ?? null,
          })

          void verifyUser(nextUser)
        })
      } catch (error) {
        console.error('[EduFinance Admin][AUTH] Erreur initialisation Firebase:', error)

        if (!mounted) return

        setUser(null)
        setAdmin(null)
        setAuthState('Impossible de restaurer la session Firebase.')
        setBooting(false)
        window.location.replace(CLIENT_APP_URL)
      }
    }

    void boot()

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [])

  if (booting) return <Loading text={authState || "Vérification des accès administrateur…"} />
  if (!user || !admin) return (
    <div className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-200">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">EduFinance Admin — diagnostic</p>
        <h1 className="mt-3 text-xl font-semibold">Session Firebase détectée, mais accès administrateur non validé</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">{authState}</p>
        <div className="mt-5 rounded-xl bg-black/20 p-4 font-mono text-xs text-slate-300">
          <div>UID : {user?.uid || '—'}</div>
          <div>Email : {user?.email || '—'}</div>
          <div>Firebase currentUser : {auth.currentUser?.uid || '—'}</div>
        </div>
        <p className="mt-4 text-xs text-slate-500">Ouvre la Console (F12). La page reste volontairement ouverte afin que le résultat exact de la lecture Firestore puisse être capturé.</p>
      </div>
    </div>
  )

  const isSuperAdmin = admin.role === 'super_admin'
  const visibleGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => isSuperAdmin || !['admins', 'subscriptions'].includes(item.id)),
  })).filter(group => group.items.length > 0)
  const currentPage = visibleGroups.flatMap(group => group.items).find(item => item.id === page)

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[272px] transform flex-col border-r border-slate-800 bg-[#0b1220] text-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-white/[0.07] px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-950 shadow-lg shadow-black/10"><Sparkles size={18}/></div>
            <div>
              <p className="text-[15px] font-semibold tracking-tight">EduFinance</p>
              <p className="text-[11px] text-slate-400">Admin workspace</p>
            </div>
          </div>
          <button className="lg:hidden text-slate-400" onClick={() => setOpen(false)}><X size={20}/></button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto p-4">
          {visibleGroups.map(group => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{group.label}</p>
              <div className="space-y-1">
                {group.items.map(item => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setPage(item.id); setOpen(false) }}
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${page === item.id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}
                    >
                      <Icon size={17} strokeWidth={1.9}/>
                      <span>{item.label}</span>
                      {page === item.id && <ChevronRight size={14} className="ml-auto opacity-60"/>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="m-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
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

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
          <div className="flex h-[76px] items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-3">
              <button className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white lg:hidden" onClick={() => setOpen(true)}><Menu size={19}/></button>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
                <h1 className="mt-0.5 text-lg font-semibold tracking-tight">{currentPage?.label || 'Console'}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 md:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/> Système opérationnel
              </div>
              <button className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50" aria-label="Notifications">
                <Bell size={17}/>
                <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-rose-500"/>
              </button>
              <div className="hidden h-9 w-px bg-slate-200 md:block"/>
              <div className="hidden items-center gap-2.5 md:flex">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">{(admin.displayName || user.email || 'A').slice(0,1).toUpperCase()}</div>
                <div className="max-w-[150px]">
                  <p className="truncate text-xs font-semibold">{admin.displayName || 'Administrateur'}</p>
                  <p className="truncate text-[11px] text-slate-400">{admin.role.replace('_', ' ')}</p>
                </div>
                <ChevronDown size={14} className="text-slate-400"/>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 md:p-8">
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

  const schoolRate = counts.schools ? Math.round((counts.activeSchools / counts.schools) * 100) : 0
  const adminRate = counts.admins ? Math.round((counts.activeAdmins / counts.admins) * 100) : 0
  const activeSchools = schools.filter(s => s.status === 'active')

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-900/10 md:px-8">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"/>
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl"/>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs text-slate-300">
              <Gauge size={13}/> Pilotage de la plateforme
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Bonjour, votre centre de contrôle est prêt.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Une vue claire des établissements, des accès et des opérations importantes. Les chiffres affichés ici proviennent des données disponibles dans la plateforme.</p>
          </div>
          <button onClick={load} disabled={loading} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-100 disabled:opacity-60">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> Actualiser les données
          </button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Établissements" value={counts.schools} hint={`${counts.activeSchools} actifs • ${schoolRate}% du parc`} icon={Building2}/>
        <StatCard label="Administrateurs" value={counts.admins} hint={`${counts.activeAdmins} actifs • ${adminRate}% actifs`} icon={ShieldCheck}/>
        <StatCard label="Établissements actifs" value={counts.activeSchools} hint="Espaces actuellement opérationnels" icon={TrendingUp}/>
        <StatCard label="Données élèves" value="À consulter" hint="Ouvrez un établissement pour ses indicateurs" icon={GraduationCap}/>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Portefeuille des établissements" subtitle="Un aperçu opérationnel du parc scolaire.">
          {loading ? <InlineLoading/> : schools.length === 0 ? <Empty icon={Building2} text="Aucun établissement enregistré."/> : (
            <div className="space-y-2">
              {schools.slice(0, 7).map(school => (
                <button key={school.id} onClick={() => onNavigate('schools')} className="group flex w-full items-center gap-4 rounded-2xl border border-transparent px-3 py-3 text-left transition hover:border-slate-200 hover:bg-slate-50">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><Building2 size={17}/></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{school.name || school.id}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{[school.city, school.province].filter(Boolean).join(' · ') || 'Localisation non renseignée'}</p>
                  </div>
                  <StatusBadge value={school.status}/>
                  <ArrowUpRight size={16} className="text-slate-300 transition group-hover:text-slate-600"/>
                </button>
              ))}
            </div>
          )}
          {!loading && schools.length > 7 && <button onClick={() => onNavigate('schools')} className="mt-3 w-full rounded-xl border border-dashed border-slate-200 py-3 text-xs font-semibold text-slate-500 hover:bg-slate-50">Voir tous les établissements</button>}
        </Panel>

        <Panel title="Indicateurs de gestion" subtitle="Signaux calculés à partir des données actuelles.">
          <div className="space-y-1">
            <InsightRow icon={Building2} label="Parc actif" value={`${schoolRate}%`} detail={`${counts.activeSchools} / ${counts.schools} établissements`}/>
            <InsightRow icon={ShieldCheck} label="Accès actifs" value={`${adminRate}%`} detail={`${counts.activeAdmins} / ${counts.admins} administrateurs`}/>
            <InsightRow icon={GraduationCap} label="Couverture élèves" value="Disponible" detail="Voir le détail par établissement"/>
            <InsightRow icon={FileBarChart} label="Reporting" value="Prêt" detail="Paiements, activité et indicateurs"/>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <QuickAction icon={Building2} title="Piloter les établissements" text="Consulter le statut, l’année scolaire et les indicateurs de chaque établissement." onClick={() => onNavigate('schools')}/>
        <QuickAction icon={CircleDollarSign} title="Suivre les finances" text="Consulter les dernières opérations de paiement et leur répartition par établissement." onClick={() => onNavigate('payments')}/>
        <QuickAction icon={FileBarChart} title="Contrôler l’activité" text="Accéder au journal opérationnel et suivre les actions importantes." onClick={() => onNavigate('activity')}/>
      </div>

      {activeSchools.length > 0 && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-emerald-600"><TrendingUp size={16}/></div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">Parc opérationnel</p>
              <p className="mt-1 text-xs leading-5 text-emerald-800/80">{activeSchools.length} établissement(s) actuellement marqué(s) comme actif(s). Les indicateurs financiers détaillés restent consultables établissement par établissement.</p>
            </div>
          </div>
        </div>
      )}
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
    <div className="space-y-6">
      <PageHeader title="Paramètres" subtitle="Préférences de la console et informations de sécurité."/>
      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <Panel title="Compte administrateur" subtitle="Identité et niveau d’accès actuellement utilisés.">
        <div className="space-y-4">
          <InfoRow label="Compte connecté" value={user.email || user.uid}/>
          <InfoRow label="Rôle" value={admin.role === 'super_admin' ? 'Super administrateur' : 'Administrateur établissement'}/>
          <InfoRow label="État de session" value="Actif"/>
          <InfoRow label="Accès console" value="Autorisé"/>
        </div>
      </Panel>
        <Panel title="Sécurité de la session" subtitle="Contrôles appliqués à l’ouverture de la console.">
          <div className="space-y-1">
            <InsightRow icon={ShieldCheck} label="Authentification" value="Active" detail="Session partagée depuis EduFinance Pro"/>
            <InsightRow icon={ShieldCheck} label="Autorisation" value="Validée" detail="Rôle et statut contrôlés"/>
            <InsightRow icon={Database} label="Données" value="Directes" detail="Lecture depuis la source de données"/>
          </div>
        </Panel>
      </div>
      <Panel title="Principe d’accès" subtitle="La console ne possède pas de formulaire de connexion indépendant.">
        <div className="space-y-3 text-sm text-slate-600">
          <p>1. La connexion est initiée depuis EduFinance Pro.</p>
          <p>2. L’accès à cette console est vérifié avant l’affichage des données.</p>
          <p>3. Les droits déterminent les espaces administratifs disponibles.</p>
          <p>4. Une session non autorisée est renvoyée vers EduFinance Pro.</p>
        </div>
      </Panel>
    </div>
  )
}

function PageHeader({ title, subtitle, onRefresh, loading }: { title: string; subtitle: string; onRefresh?: () => void; loading?: boolean }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">EduFinance</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">{subtitle}</p>
      </div>
      {onRefresh && <button onClick={onRefresh} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> Actualiser</button>}
    </div>
  )
}

function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint: string; icon: IconType }) {
  return <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(15,23,42,0.07)]">
    <div className="flex items-start justify-between gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><Icon size={18}/></div>
      <MoreHorizontal size={17} className="text-slate-300"/>
    </div>
    <p className="mt-5 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    <p className="mt-2 text-xs text-slate-500">{hint}</p>
  </div>
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

function InsightRow({ icon: Icon, label, value, detail }: { icon: IconType; label: string; value: string; detail: string }) {
  return <div className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-slate-50">
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600"><Icon size={16}/></div>
    <div className="min-w-0 flex-1"><p className="text-sm font-medium">{label}</p><p className="mt-0.5 truncate text-xs text-slate-400">{detail}</p></div>
    <div className="text-right"><p className="text-sm font-semibold">{value}</p></div>
  </div>
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.04)] md:p-6">
    <div className="mb-5 flex items-start justify-between gap-4">
      <div><h3 className="font-semibold tracking-tight">{title}</h3><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>
      <ChevronRight size={17} className="mt-0.5 text-slate-300"/>
    </div>
    {children}
  </section>
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
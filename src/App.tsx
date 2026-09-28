import { useEffect, useMemo, useState } from 'react'
import {
  Activity, Building2, CreditCard, LayoutDashboard, LogOut, Menu, Settings,
  ShieldCheck, UserRound, Users, X, Search, Bell, ChevronRight, WalletCards,
  TrendingUp, GraduationCap
} from 'lucide-react'
import {
  collection, getDocs, query, where
} from 'firebase/firestore'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { auth, db } from './lib/firebase'
import { resolveAdminAccess, type AdminRecord } from './lib/admin'

type Page = 'dashboard' | 'schools' | 'admins' | 'subscriptions' | 'payments' | 'users' | 'activity' | 'settings'

type Stat = { label: string; value: string; icon: typeof Building2; hint: string }

const nav: { id: Page; label: string; icon: typeof Building2 }[] = [
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
  const CLIENT_APP_URL = 'https://josephmbeko70-ui.github.io/edufinance/'
  const [page, setPage] = useState<Page>('dashboard')
  const [open, setOpen] = useState(false)

  useEffect(() => onAuthStateChanged(auth, async (next) => {
    setUser(next)
    if (!next) {
      setAdmin(null)
      window.location.replace(CLIENT_APP_URL)
      return
    }

    try {
      const access = await resolveAdminAccess(next)
      if (!access) {
        setAdmin(null)
        window.location.replace(CLIENT_APP_URL)
        return
      }
      setAdmin(access)
    } catch {
      setAdmin(null)
      window.location.replace(CLIENT_APP_URL)
      return
    } finally {
      setBooting(false)
    }
  }), [])

  if (booting) return <div className="min-h-screen grid place-items-center text-slate-500">Vérification des accès…</div>
  if (!user || !admin) return <div className="min-h-screen grid place-items-center text-slate-500">Redirection vers EduFinance Pro…</div>

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 bg-slate-950 text-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div>
            <p className="text-lg font-semibold tracking-tight">EduFinance</p>
            <p className="text-xs text-slate-400">Administration</p>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X size={20}/></button>
        </div>
        <nav className="space-y-1 p-4">
          {nav.map(item => {
            const Icon = item.icon
            return <button key={item.id} onClick={() => { setPage(item.id); setOpen(false) }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${page === item.id ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
              <Icon size={18}/><span>{item.label}</span>
            </button>
          })}
        </nav>
        <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><UserRound size={17}/></div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{admin.displayName || user.email}</p>
              <p className="text-xs capitalize text-slate-400">{admin.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="mt-3 flex items-center gap-2 text-xs text-slate-300 hover:text-white"><LogOut size={14}/> Déconnexion</button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-20 items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-3">
              <button className="lg:hidden" onClick={() => setOpen(true)}><Menu size={22}/></button>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Console centrale</p>
                <h1 className="text-xl font-semibold capitalize">{nav.find(x => x.id === page)?.label}</h1>
              </div>
            </div>
            <button className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white"><Bell size={18}/><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500"/></button>
          </div>
        </header>

        <main className="p-4 md:p-8">
          {page === 'dashboard' && <Dashboard />}
          {page === 'schools' && <EntityPage title="Établissements" subtitle="Pilotage du parc d’établissements et de leur état." />}
          {page === 'admins' && <EntityPage title="Administrateurs" subtitle="Comptes autorisés à administrer EduFinance." />}
          {page === 'subscriptions' && <Subscriptions />}
          {page === 'payments' && <EntityPage title="Paiements" subtitle="Suivi des transactions et encaissements." />}
          {page === 'users' && <EntityPage title="Utilisateurs" subtitle="Vue transversale des utilisateurs de la plateforme." />}
          {page === 'activity' && <EntityPage title="Activité / Journal" subtitle="Traçabilité des actions importantes." />}
          {page === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  )
}


function Dashboard() {
  const [schools, setSchools] = useState(0)
  const [students, setStudents] = useState(0)
  const [admins, setAdmins] = useState(0)
  const [activeSubs, setActiveSubs] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const schoolsSnap = await getDocs(collection(db, 'schools'))
        setSchools(schoolsSnap.size)
        let studentTotal = 0
        for (const s of schoolsSnap.docs) {
          try { studentTotal += (await getDocs(collection(db, 'schools', s.id, 'students'))).size } catch {}
        }
        setStudents(studentTotal)
        try { setAdmins((await getDocs(collection(db, 'admins'))).size) } catch {}
        try {
          const sub = await getDocs(query(collection(db, 'subscriptions'), where('status', '==', 'active')))
          setActiveSubs(sub.size)
        } catch {}
      } catch {}
    }
    load()
  }, [])

  const stats: Stat[] = useMemo(() => [
    { label:'Établissements', value:String(schools), icon:Building2, hint:'Sources Firestore' },
    { label:'Élèves', value:String(students), icon:GraduationCap, hint:'Sous-collections schools/*/students' },
    { label:'Administrateurs', value:String(admins), icon:ShieldCheck, hint:'Collection admins' },
    { label:'Abonnements actifs', value:String(activeSubs), icon:WalletCards, hint:'Collection subscriptions' },
  ], [schools, students, admins, activeSubs])

  return <div className="space-y-8">
    <div>
      <p className="text-sm text-slate-500">Synthèse opérationnelle</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">Vue d’ensemble</h2>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(s => { const Icon=s.icon; return <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><Icon size={19}/></div><TrendingUp size={17} className="text-emerald-500"/></div>
        <p className="mt-5 text-sm text-slate-500">{s.label}</p><p className="mt-1 text-3xl font-semibold">{s.value}</p><p className="mt-2 text-xs text-slate-400">{s.hint}</p>
      </div>})}
    </div>
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <Panel title="Évolution des inscriptions" subtitle="Structure prête à recevoir les agrégations Firestore.">
        <div className="grid h-72 place-items-center rounded-xl bg-slate-50 text-sm text-slate-400">Aucune série historique exploitable pour le moment.</div>
      </Panel>
      <Panel title="Répartition des abonnements" subtitle="Plans et effectifs.">
        <div className="space-y-3">
          {['Classique · $1 / élève','Professionnel · $1.50 / élève','Établissement · $2 / élève'].map((x,i)=><div key={x} className="flex items-center justify-between rounded-xl border border-slate-100 p-4"><span className="text-sm">{x}</span><span className="text-xs text-slate-400">À alimenter</span></div>)}
        </div>
      </Panel>
    </div>
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Paiements récents" subtitle="Les transactions apparaîtront dès que leur collection sera renseignée."><Empty icon={CreditCard} text="Aucun paiement récent disponible." /></Panel>
      <Panel title="Activité récente" subtitle="Journal d’audit transversal."><Empty icon={Activity} text="Aucune activité à afficher." /></Panel>
    </div>
  </div>
}

function EntityPage({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="space-y-6">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div><p className="text-sm text-slate-500">{subtitle}</p><h2 className="mt-1 text-2xl font-semibold">{title}</h2></div>
      <div className="relative w-full md:w-72"><Search size={17} className="absolute left-3 top-3.5 text-slate-400"/><input placeholder="Rechercher…" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4"/></div>
    </div>
    <Panel title={title} subtitle="Les données réelles seront branchées sur les collections existantes, sans modification arbitraire de leur schéma.">
      <div className="grid min-h-72 place-items-center"><Empty icon={Users} text="Aucune donnée disponible actuellement." /></div>
    </Panel>
  </div>
}

function Subscriptions() {
  return <div className="space-y-6">
    <div><p className="text-sm text-slate-500">Plans de la plateforme</p><h2 className="mt-1 text-2xl font-semibold">Abonnements</h2></div>
    <div className="grid gap-5 md:grid-cols-3">
      {[
        ['Classique','$1 / élève','Facturation par élève'],
        ['Professionnel','$1.50 / élève','Facturation par élève'],
        ['Établissement','$2 / élève','Facturation par élève'],
      ].map(([name,price,desc])=><div key={name} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft"><p className="text-sm text-slate-500">{name}</p><p className="mt-3 text-3xl font-semibold">{price}</p><p className="mt-2 text-sm text-slate-500">{desc}</p><div className="mt-6 rounded-xl bg-slate-50 p-3 text-xs text-slate-400">Données d’abonnement à connecter</div></div>)}
    </div>
    <Panel title="Abonnements des établissements" subtitle="Statut, dates, effectif et montant."><Empty icon={WalletCards} text="Aucun abonnement enregistré dans une collection dédiée pour le moment." /></Panel>
  </div>
}

function SettingsPage() {
  return <div className="max-w-3xl space-y-6">
    <div><p className="text-sm text-slate-500">Configuration générale</p><h2 className="mt-1 text-2xl font-semibold">Paramètres</h2></div>
    <Panel title="Plateforme" subtitle="Paramètres généraux de la console admin.">
      <div className="space-y-4">
        <Row label="Projet Firebase" value="edufinance-e0fd5" />
        <Row label="Base path" value="/edufinance-admin/" />
        <Row label="Compte super administrateur prévu" value="controlpolytra@gmail.com" />
        <Row label="Sécurité" value="Firebase Auth + collection admins + règles Firestore" />
      </div>
    </Panel>
  </div>
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-col gap-1 border-b border-slate-100 pb-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm text-slate-500">{label}</span><span className="text-sm font-medium">{value}</span></div>
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"><div className="mb-5 flex items-start justify-between gap-4"><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><ChevronRight size={18} className="text-slate-300"/></div>{children}</section>
}

function Empty({ icon: Icon, text }: { icon: typeof Activity; text: string }) {
  return <div className="flex flex-col items-center justify-center py-12 text-center"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Icon size={20}/></div><p className="mt-4 text-sm text-slate-500">{text}</p></div>
}

export default App
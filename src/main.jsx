import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowUpRight, CalendarDays, Camera, Check, ChevronRight, Clock3, FileVideo,
  FolderOpen, Grid2X2, Image, ImagePlus, LayoutDashboard, LoaderCircle,
  MoreHorizontal, Plus, Search, Send, Settings2, Upload, Video, X, AlertCircle,
  BriefcaseBusiness, Play, RefreshCw, ExternalLink, Eye, Heart, LogOut, ShieldCheck, Users, AtSign, MessageCircle,
  Pencil, Rocket, RotateCcw, ScrollText
} from 'lucide-react'
import './styles.css'
import './pages.css'
import './type.css'
import './live.css'
import './profile.css'
import './discussion.css'
import './publication.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '')
const N8N_URL = 'https://n8n-gdg.abdoulazizdione.cloud'
const WORKSPACE_ID = 'default'
const platformMeta = {
  instagram: { label: 'Instagram', icon: Camera, color: '#ef65a4', bg: '#fff0f7' },
  linkedin: { label: 'LinkedIn', icon: BriefcaseBusiness, color: '#2379b5', bg: '#ebf6ff' },
  youtube: { label: 'YouTube', icon: Video, color: '#ea5a4f', bg: '#fff1ef' },
  tiktok: { label: 'TikTok', icon: Play, color: '#111', bg: '#f2f4f3' },
  x: { label: 'X', icon: AtSign, color: '#111', bg: '#f2f4f3' },
}

async function request(path, options = {}) {
  const hasJsonBody = options.body !== undefined && !(options.body instanceof FormData)
  const response = await fetch(`${API_URL}${path}`, { credentials: 'include', ...options, headers: { ...(hasJsonBody ? { 'content-type': 'application/json' } : {}), ...options.headers } })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) { const error = new Error(payload.error || 'Une erreur est survenue.'); error.code = payload.code; throw error }
  return payload.data
}

const formatDate = (value, withTime = true) => value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', ...(withTime ? { timeStyle: 'short' } : {}) }).format(new Date(value)) : 'Non planifiée'
const mediaType = (asset) => asset?.kind === 'video' ? 'Vidéo' : 'Image'
const statusLabel = { draft: 'Brouillon', scheduled: 'Programmée', dispatching: 'En cours', published: 'Publiée', failed: 'Échec' }
const deliveryLabel = { pending: 'En attente de confirmation', published: 'Publié', failed: 'Échec' }
const pad = (value) => String(value).padStart(2, '0')
// datetime-local inputs expect local wall-clock time, not the UTC string toISOString() returns.
const toLocalInput = (value) => { const date = new Date(value); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}` }
const formatTime = (value) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value))

function App() {
  const [user, setUser] = useState(undefined)
  useEffect(() => { request('/v1/auth/session').then((data) => setUser(data.user)).catch(() => setUser(null)) }, [])
  if (user === undefined) return <div className="auth-loading"><span className="brand-mark">R</span><span>Vérification de votre session…</span></div>
  if (!user) return <AuthScreen onAuthenticated={setUser} />
  return <Workspace session={user} onSignedOut={() => setUser(null)} />
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setError('')
    if (mode === 'activate' && password !== confirmation) { setError('Les deux mots de passe doivent être identiques.'); return }
    setSaving(true)
    try {
      const data = await request(mode === 'activate' ? '/v1/auth/activate' : '/v1/auth/session', { method: 'POST', body: JSON.stringify({ email, password }) })
      onAuthenticated(data.user)
    } catch (cause) {
      if (cause.code === 'PASSWORD_SETUP_REQUIRED') { setMode('activate'); setConfirmation(''); setError('Votre compte est prêt. Confirmez votre mot de passe pour l’activer.') }
      else if (cause.code === 'ACCOUNT_ACTIVE') { setMode('login'); setPassword(''); setConfirmation(''); setError('Ce compte est déjà activé. Connectez-vous avec votre mot de passe.') }
      else setError(cause.message)
    } finally { setSaving(false) }
  }
  return <main className="auth-page"><section className="auth-intro"><div className="auth-brand"><span className="brand-mark">R</span><b>relay</b></div><div className="auth-copy"><span className="eyebrow">ESPACE ÉQUIPE</span><h1>Publier avec une équipe alignée.</h1><p>Accédez à vos médias, vos campagnes et vos connexions sociales depuis un espace privé.</p></div><div className="auth-steps"><span><i>01</i>Vos comptes sociaux restent reliés à l’espace Relay.</span><span><i>02</i>Les publications sont programmées à partir de données réelles.</span></div></section><section className="auth-form-wrap"><form className="auth-form" onSubmit={submit}><span className="eyebrow">{mode === 'activate' ? 'ACTIVATION DU COMPTE' : 'CONNEXION SÉCURISÉE'}</span><h2>{mode === 'activate' ? 'Choisissez votre mot de passe.' : 'Bienvenue dans Relay.'}</h2><p>{mode === 'activate' ? 'Votre adresse est autorisée. Ce mot de passe sera celui de vos prochaines connexions.' : 'Utilisez l’adresse e-mail qui vous a été attribuée.'}</p><label>ADRESSE E-MAIL<input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@entreprise.com" required /></label><label>MOT DE PASSE<input autoComplete={mode === 'activate' ? 'new-password' : 'current-password'} type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength="8" placeholder="8 caractères minimum" required /></label>{mode === 'activate' && <label>CONFIRMER LE MOT DE PASSE<input autoComplete="new-password" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength="12" placeholder="Répétez le mot de passe" required /></label>}{error && <div className="auth-error"><AlertCircle size={16}/>{error}</div>}<button className="auth-submit" disabled={saving}>{saving ? 'Patientez…' : mode === 'activate' ? 'Activer mon compte' : 'Se connecter'} <ArrowUpRight size={16}/></button>{mode === 'activate' && <button type="button" className="auth-back" onClick={() => { setMode('login'); setError(''); setPassword(''); setConfirmation('') }}>J’ai déjà un mot de passe</button>}</form></section></main>
}

function Workspace({ session, onSignedOut }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [assets, setAssets] = useState([])
  const [publications, setPublications] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [connections, setConnections] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [discussionAsset, setDiscussionAsset] = useState(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const assetMap = useMemo(() => new Map(assets.map((asset) => [asset._id, asset])), [assets])
  const refresh = async () => {
    setLoading(true); setError('')
    try {
      const [nextAssets, nextPublications, nextDashboard, nextConnections, nextAnalytics] = await Promise.all([
        request(`/v1/assets?workspaceId=${WORKSPACE_ID}`), request(`/v1/publications?workspaceId=${WORKSPACE_ID}`),
        request(`/v1/dashboard?workspaceId=${WORKSPACE_ID}`), request(`/v1/connections?workspaceId=${WORKSPACE_ID}`), request(`/v1/analytics?workspaceId=${WORKSPACE_ID}`),
      ])
      setAssets(nextAssets); setPublications(nextPublications); setDashboard(nextDashboard); setConnections(nextConnections); setAnalytics(nextAnalytics)
    } catch (cause) { setError(cause.message || 'Impossible de joindre l’API Relay.') } finally { setLoading(false) }
  }
  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search)
    if (parameters.get('settings') === 'connections') setActiveTab('settings')
    if (parameters.get('notice') === 'instagram-connected') setNotice('Compte Instagram connecté.')
    if (parameters.get('notice') === 'instagram-error') setNotice('La connexion Instagram n’a pas pu être finalisée.')
    if (parameters.get('notice') === 'x-connected') setNotice('Compte X connecté.')
    if (parameters.get('notice') === 'x-error') setNotice('La connexion X n’a pas pu être finalisée.')
    if (parameters.has('settings') || parameters.has('notice')) window.history.replaceState({}, '', window.location.pathname)
    refresh()
  }, [])
  const flash = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 3500) }
  const onCreated = async (publication) => { await refresh(); setSelectedId(publication._id); setActiveTab('calendar'); flash('Publication enregistrée et programmée.') }
  const replacePublication = (updated) => setPublications((current) => current.map((item) => item._id === updated._id ? updated : item))
  const selected = publications.find((item) => item._id === selectedId)
  const inFlight = publications.some((item) => item.status === 'dispatching' || (item.status === 'scheduled' && new Date(item.scheduledAt).getTime() < Date.now() + 60_000))
  const reloadPublications = () => request(`/v1/publications?workspaceId=${WORKSPACE_ID}`).then(setPublications).catch(() => {})
  useEffect(() => {
    if (!inFlight) return
    const timer = window.setInterval(reloadPublications, 8000)
    return () => window.clearInterval(timer)
  }, [inFlight])
  const pageTitle = { overview: 'Vue d’ensemble', calendar: 'Publications', media: 'Médiathèque', analytics: 'Performances', settings: 'Paramètres' }[activeTab]

  return <div className="app-shell wide-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">R</span><span>relay</span></div>
      <div className="workspace-switcher"><span className="avatar-small">R</span><span>Mon espace</span></div>
      <nav className="main-nav">
        <Nav icon={LayoutDashboard} label="Vue d’ensemble" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <Nav icon={CalendarDays} label="Publications" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
        <Nav icon={FolderOpen} label="Médiathèque" active={activeTab === 'media'} onClick={() => setActiveTab('media')} />
        <Nav icon={Grid2X2} label="Performances" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
      </nav>
      <div className="sidebar-label">ESPACE</div>
      <div className="space-line"><span className="space-dot mint"></span> Données réelles</div>
      <div className="sidebar-bottom"><Nav icon={Settings2} label="Paramètres" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} /><div className="profile"><span className="avatar">R</span><span className="profile-details"><b>{session.email}</b><small>{session.role === 'owner' ? 'Administrateur' : 'Membre'}</small></span></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="crumb"><span>Relay</span><ChevronRight size={15}/><b>{pageTitle}</b></div><div className="header-actions"><button className="icon-button" onClick={refresh} aria-label="Actualiser"><RefreshCw size={17}/></button><button className="primary-button" onClick={() => setComposerOpen(true)}><Plus size={18}/>Créer une publication</button></div></header>
      {error && <ApiError message={error} onRetry={refresh} />}
      {!error && loading && <LoadingState />}
      {!error && !loading && activeTab === 'overview' && <OverviewPage dashboard={dashboard} publications={publications} assets={assetMap} connections={connections} setActiveTab={setActiveTab} setComposerOpen={setComposerOpen} onOpen={setSelectedId} />}
      {!error && !loading && activeTab === 'calendar' && <PublicationsPage publications={publications} assets={assetMap} onOpen={setSelectedId} onChanged={replacePublication} flash={flash} setComposerOpen={setComposerOpen} />}
      {!error && !loading && activeTab === 'media' && <MediaPage assets={assets} refresh={refresh} flash={flash} setComposerOpen={setComposerOpen} onDiscuss={setDiscussionAsset} />}
      {!error && !loading && activeTab === 'analytics' && <AnalyticsPage analytics={analytics} />}
      {!error && !loading && activeTab === 'settings' && <SettingsPage connections={connections} session={session} onSignedOut={onSignedOut} />}
    </main>
    {selected && <PublicationStudio publication={selected} asset={assetMap.get(selected.assetId)} onClose={() => setSelectedId(null)} onChanged={replacePublication} onPoll={reloadPublications} flash={flash} />}
    {composerOpen && <Composer assets={assets} refresh={refresh} onClose={() => setComposerOpen(false)} onCreated={onCreated} />}
    {discussionAsset && <AssetDiscussion asset={discussionAsset} session={session} onClose={() => setDiscussionAsset(null)} />}
    {notice && <div className="toast"><Check size={16}/>{notice}</div>}
  </div>
}

function Nav({ icon: Icon, label, active, onClick }) { return <button className={active ? 'nav-item active' : 'nav-item'} onClick={onClick}><Icon size={18}/>{label}</button> }
function LoadingState() { return <div className="empty-state"><LoaderCircle size={26} className="spin"/><p>Chargement de votre espace…</p></div> }
function ApiError({ message, onRetry }) { return <section className="api-error"><AlertCircle size={20}/><div><b>L’application ne peut pas joindre son API.</b><p>{message}</p><code>VITE_API_URL={API_URL}</code></div><button className="secondary-button" onClick={onRetry}>Réessayer</button></section> }
function Metric({ icon: Icon, value, label }) { return <div className="surface metric"><span className="metric-icon"><Icon size={18}/></span><div className="metric-value">{value}</div><p>{label}</p></div> }

function OverviewPage({ dashboard, publications, assets, connections, setActiveTab, setComposerOpen, onOpen }) {
  const upcoming = dashboard?.upcoming
  const upcomingAsset = assets.get(upcoming?.assetId)
  return <section className="content-area product-page"><div className="page-title-row"><div><span className="eyebrow">ESPACE DE PUBLICATION</span><h1>Votre contenu, au bon moment.</h1><p>Cette vue reflète uniquement les données enregistrées dans votre espace.</p></div><button className="primary-button" onClick={() => setComposerOpen(true)}><Plus size={17}/>Nouvelle publication</button></div>
    {upcoming ? <div className="overview-hero"><div><span className="eyebrow">PROCHAINE DIFFUSION</span><h2>{upcoming.title}</h2><p>{formatDate(upcoming.scheduledAt)} · {upcoming.destinations.map((key) => platformMeta[key].label).join(', ')}</p><button className="light-action" onClick={() => setActiveTab('calendar')}>Ouvrir les publications <ArrowUpRight size={15}/></button></div><AssetPreview asset={upcomingAsset} className="hero-preview" /></div> : <EmptyBlock title="Aucune publication programmée" copy="Importez un média, préparez sa légende et choisissez sa date de diffusion." action="Créer une publication" onAction={() => setComposerOpen(true)} />}
    <div className="metric-grid"><Metric icon={CalendarDays} value={dashboard?.byStatus?.scheduled || 0} label="publications programmées"/><Metric icon={FolderOpen} value={dashboard?.assets || 0} label="médias importés"/><Metric icon={Camera} value={dashboard?.connections || 0} label="comptes connectés"/></div>
    <div className="overview-lower"><div className="surface activity-card"><div className="section-title"><div><span className="eyebrow">PUBLICATIONS</span><h2>Les dernières activités.</h2></div><button className="text-button" onClick={() => setActiveTab('calendar')}>Tout voir <ArrowUpRight size={14}/></button></div>{publications.length ? publications.slice(0, 5).map((publication) => <div className="activity-row" key={publication._id} role="button" tabIndex="0" onClick={() => onOpen(publication._id)}><AssetPreview asset={assets.get(publication.assetId)} /><span><b>{publication.title}</b><small>{statusLabel[publication.status]} · {formatDate(publication.scheduledAt)}</small></span><NetworkStack items={publication.destinations}/></div>) : <p className="quiet-copy">Vos publications apparaîtront ici dès leur création.</p>}</div><div className="surface pulse-card"><span className="eyebrow">CONNEXIONS</span><h2>{connections.filter((item) => item.connected).length ? 'Vos canaux actifs.' : 'Aucun canal connecté.'}</h2><p>Les comptes autorisés dans Relay apparaissent ici après leur connexion sécurisée.</p><button className="light-action" onClick={() => setActiveTab('settings')}>Voir les connexions <ArrowUpRight size={14}/></button></div></div>
  </section>
}

const publicationFilters = [['all', 'Toutes'], ['scheduled', 'Programmées'], ['dispatching', 'En cours'], ['published', 'Publiées'], ['failed', 'Échecs'], ['draft', 'Brouillons']]
const canPublishNow = (publication) => ['draft', 'scheduled', 'failed'].includes(publication.status)
const isStuck = (publication) => publication.status === 'dispatching' && Date.now() - new Date(publication.updatedAt).getTime() > 20 * 60 * 1000

async function publishNow(publication, onChanged, flash) {
  const label = publication.status === 'failed' || publication.status === 'dispatching' ? 'Relancer la diffusion maintenant ?' : 'Publier maintenant, sans attendre la date programmée ?'
  if (!window.confirm(label)) return
  try { onChanged(await request(`/v1/publications/${publication._id}/publish-now`, { method: 'POST', body: JSON.stringify({ workspaceId: WORKSPACE_ID }) })); flash('Diffusion lancée. Suivez-la dans le journal.') } catch (cause) { flash(cause.message) }
}

function PublicationsPage({ publications, assets, onOpen, onChanged, flash, setComposerOpen }) {
  const [filter, setFilter] = useState('all')
  const visible = filter === 'all' ? publications : publications.filter((item) => item.status === filter)
  const count = (key) => key === 'all' ? publications.length : publications.filter((item) => item.status === key).length
  return <section className="content-area product-page"><div className="page-title-row"><div><span className="eyebrow">PUBLICATIONS</span><h1>Vos vidéos programmées.</h1><p>Lisez chaque vidéo, suivez sa diffusion et ajustez-la sans quitter la page.</p></div><button className="primary-button" onClick={() => setComposerOpen(true)}><Plus size={17}/>Créer une publication</button></div>
    <div className="reel-filters" role="tablist">{publicationFilters.map(([key, label]) => <button key={key} role="tab" aria-selected={filter === key} className={filter === key ? 'filter-chip active' : 'filter-chip'} onClick={() => setFilter(key)}>{label}<i>{count(key)}</i></button>)}</div>
    {visible.length ? <div className="reel-grid">{visible.map((publication) => { const asset = assets.get(publication.assetId); return <article className="reel" key={publication._id}>
      <div className="reel-media">{asset ? asset.kind === 'video' ? <video src={asset.publicUrl} controls playsInline preload="metadata" /> : <img src={asset.publicUrl} alt={asset.name}/> : <div className="reel-missing"><Image size={20}/>Média introuvable</div>}<span className={`status status-${publication.status} reel-status`}>{publication.status === 'dispatching' && <LoaderCircle size={11} className="spin"/>}{statusLabel[publication.status]}</span></div>
      <button className="reel-title" onClick={() => onOpen(publication._id)}><b>{publication.title}</b><ChevronRight size={15}/></button>
      <div className="reel-meta"><span><Clock3 size={13}/>{formatDate(publication.scheduledAt)}</span><NetworkStack items={publication.destinations}/></div>
      {publication.lastError && <p className="reel-error"><AlertCircle size={13}/>{publication.lastError}</p>}
      <div className="reel-actions"><button className="text-button" onClick={() => onOpen(publication._id)}><ScrollText size={13}/>Détails et journal</button>{canPublishNow(publication) && <button className="text-button" onClick={() => publishNow(publication, onChanged, flash)}>{publication.status === 'failed' ? <><RotateCcw size={13}/>Relancer</> : <><Rocket size={13}/>Publier maintenant</>}</button>}{isStuck(publication) && <button className="text-button" onClick={() => publishNow(publication, onChanged, flash)}><RotateCcw size={13}/>Relancer</button>}</div>
    </article> })}</div> : <EmptyBlock title={publications.length ? 'Aucune publication dans ce filtre' : 'Aucune publication pour l’instant'} copy="Ajoutez un média et programmez sa diffusion." action="Créer une publication" onAction={() => setComposerOpen(true)} />}
  </section>
}

function PublicationStudio({ publication, asset, onClose, onChanged, onPoll, flash }) {
  const [editing, setEditing] = useState(false)
  const [events, setEvents] = useState(null)
  const live = publication.status === 'dispatching' || publication.status === 'scheduled'
  useEffect(() => {
    let cancelled = false
    const load = () => request(`/v1/publications/${publication._id}/events?workspaceId=${WORKSPACE_ID}`).then((data) => { if (!cancelled) setEvents(data) }).catch(() => { if (!cancelled) setEvents((current) => current || []) })
    load()
    const timer = live ? window.setInterval(() => { load(); onPoll() }, 4000) : null
    return () => { cancelled = true; if (timer) window.clearInterval(timer) }
  }, [publication._id, live, publication.updatedAt])
  useEffect(() => { const onKey = (event) => event.key === 'Escape' && onClose(); window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [onClose])
  const editable = ['draft', 'scheduled', 'failed'].includes(publication.status)
  return <div className="modal-backdrop studio-backdrop" role="dialog" aria-modal="true" aria-label={publication.title} onClick={(event) => event.target === event.currentTarget && onClose()}><section className="studio">
    <div className="studio-media">{asset ? asset.kind === 'video' ? <video src={asset.publicUrl} controls autoPlay playsInline preload="auto" /> : <img src={asset.publicUrl} alt={asset.name}/> : <div className="reel-missing"><Image size={22}/>Média introuvable</div>}</div>
    <div className="studio-side">
      <header className="studio-head"><span className={`status status-${publication.status}`}>{publication.status === 'dispatching' && <LoaderCircle size={11} className="spin"/>}{statusLabel[publication.status]}</span><button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={18}/></button></header>
      {editing ? <PublicationEditor publication={publication} onCancel={() => setEditing(false)} onSaved={(updated) => { onChanged(updated); setEditing(false); flash('Publication et planification mises à jour.') }} /> : <>
        <h2>{publication.title}</h2>
        <p className="studio-caption">{publication.caption || 'Aucune légende ajoutée.'}</p>
        <dl className="studio-facts"><div><dt>Programmée</dt><dd>{formatDate(publication.scheduledAt)}</dd></div>{publication.publishedAt && <div><dt>Publiée</dt><dd>{formatDate(publication.publishedAt)}</dd></div>}<div><dt>Fichier</dt><dd>{asset ? `${asset.name} · ${mediaType(asset)}` : '—'}</dd></div></dl>
        <div className="studio-destinations">{publication.destinations.map((name) => { const meta = platformMeta[name]; const Icon = meta.icon; const delivery = publication.deliveries?.[name]; return <div className="destination" key={name}><span className="network-logo" style={{ color: meta.color, background: meta.bg }}><Icon size={16}/></span><span><b>{meta.label}</b><small className={delivery?.status === 'failed' ? 'delivery-failed' : ''}>{delivery ? delivery.error || deliveryLabel[delivery.status] : publication.status === 'dispatching' ? 'Diffusion en cours…' : 'Pas encore diffusé'}</small></span>{delivery?.externalUrl && <a className="text-button" href={delivery.externalUrl} target="_blank" rel="noreferrer">Voir le post <ExternalLink size={12}/></a>}</div> })}</div>
        <div className="studio-actions">{editable && <button className="secondary-button" onClick={() => setEditing(true)}><Pencil size={14}/>Modifier</button>}{(canPublishNow(publication) || isStuck(publication)) && <button className="primary-button" onClick={() => publishNow(publication, onChanged, flash)}>{publication.status === 'draft' || publication.status === 'scheduled' ? <><Rocket size={14}/>Publier maintenant</> : <><RotateCcw size={14}/>Relancer</>}</button>}</div>
      </>}
      <DeliveryLog events={events} live={live} />
    </div>
  </section></div>
}

function DeliveryLog({ events, live }) {
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }) }, [events?.length])
  return <section className="delivery-log"><div className="delivery-log-head"><span className="eyebrow">JOURNAL DE DIFFUSION</span>{live && <span className="live-dot">Actualisation auto</span>}</div>{events === null ? <p className="quiet-copy"><LoaderCircle size={13} className="spin"/> Chargement…</p> : events.length ? <ol>{events.map((event) => <li key={event._id} className={`log-${event.level}`}><time>{formatTime(event.createdAt)}</time><span>{event.platform && <b>{platformMeta[event.platform]?.label} · </b>}{event.message}</span></li>)}<li ref={endRef} className="log-end" aria-hidden="true" /></ol> : <p className="quiet-copy">Aucun événement enregistré. Les publications programmées avant cette mise à jour n’ont pas d’historique.</p>}</section>
}

function MediaPage({ assets, refresh, flash, setComposerOpen, onDiscuss }) {
  const inputRef = useRef(null); const [uploading, setUploading] = useState(false); const [query, setQuery] = useState('')
  const upload = async (file) => { if (!file) return; setUploading(true); try { const form = new FormData(); form.append('workspaceId', WORKSPACE_ID); form.append('file', file); await request('/v1/assets/upload', { method: 'POST', body: form }); await refresh(); flash('Média importé.'); } catch (cause) { flash(cause.message) } finally { setUploading(false); if (inputRef.current) inputRef.current.value = '' } }
  const filtered = assets.filter((asset) => asset.name.toLowerCase().includes(query.toLowerCase()))
  return <section className="content-area product-page"><div className="page-title-row"><div><span className="eyebrow">BIBLIOTHÈQUE</span><h1>Vos médias.</h1><p>Ajoutez vos retours avant de programmer une publication.</p></div><button className="primary-button" onClick={() => inputRef.current?.click()}><Upload size={16}/>{uploading ? 'Import en cours…' : 'Importer un média'}</button></div><input ref={inputRef} className="visually-hidden" type="file" accept="image/*,video/*" onChange={(event) => upload(event.target.files?.[0])}/><div className="media-tools"><div className="media-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un fichier" /></div><span className="filter-chip active">{assets.length} fichier{assets.length > 1 ? 's' : ''}</span></div><div className="media-layout"><button className="upload-tile" onClick={() => inputRef.current?.click()}><ImagePlus size={23}/><b>Ajouter un média</b><span>Images ou vidéos · 2 Go maximum</span></button>{filtered.map((asset) => <article className="media-tile" key={asset._id}><AssetPreview asset={asset} library/><div><b>{asset.name}</b><small>{mediaType(asset)} · importé le {formatDate(asset.createdAt, false)}</small></div><button className="media-discuss" onClick={() => onDiscuss(asset)}><MessageCircle size={14}/>Discuter</button></article>)}</div>{!assets.length && <p className="quiet-copy">Aucun média n’a encore été importé.</p>}<button className="floating-composer" onClick={() => setComposerOpen(true)}>Créer depuis la médiathèque</button></section>
}

function AssetDiscussion({ asset, session, onClose }) {
  const [comments, setComments] = useState(null); const [body, setBody] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  const load = async () => { try { setComments(await request(`/v1/assets/${asset._id}/comments?workspaceId=${WORKSPACE_ID}`)) } catch (cause) { setError(cause.message) } }
  useEffect(() => { load() }, [asset._id])
  const submit = async (event) => { event.preventDefault(); if (!body.trim() || saving) return; setSaving(true); setError(''); try { const comment = await request(`/v1/assets/${asset._id}/comments`, { method: 'POST', body: JSON.stringify({ workspaceId: WORKSPACE_ID, body: body.trim() }) }); setComments((current) => [...(current || []), comment]); setBody('') } catch (cause) { setError(cause.message) } finally { setSaving(false) } }
  return <div className="modal-backdrop discussion-backdrop" role="dialog" aria-modal="true" aria-label={`Discussion sur ${asset.name}`}><section className="discussion-panel"><button className="modal-close" onClick={onClose} aria-label="Fermer la discussion"><X size={18}/></button><div className="discussion-heading"><span className="eyebrow">DISCUSSION D’ÉQUIPE</span><h2>Vos retours sur ce contenu.</h2><p>Les commentaires sont visibles par tous les membres de Relay avant publication.</p></div><div className="discussion-context"><AssetPreview asset={asset} library/><div><b>{asset.name}</b><small>{mediaType(asset)} · importé le {formatDate(asset.createdAt, false)}</small></div></div><div className="comment-stream">{comments === null ? <div className="comment-loading"><LoaderCircle size={17} className="spin"/>Chargement de la discussion…</div> : comments.length ? comments.map((comment) => <article className={comment.authorEmail === session.email ? 'comment-entry mine' : 'comment-entry'} key={comment._id}><span className="comment-avatar">{comment.authorEmail.slice(0, 1).toUpperCase()}</span><div><header><b>{comment.authorEmail === session.email ? 'Vous' : comment.authorEmail}</b><time>{formatDate(comment.createdAt)}</time></header><p>{comment.body}</p></div></article>) : <div className="comment-empty"><MessageCircle size={20}/><b>La discussion commence ici.</b><p>Partagez une idée, une correction ou une validation.</p></div>}</div>{error && <p className="form-error">{error}</p>}<form className="comment-form" onSubmit={submit}><span className="comment-avatar current">{session.email.slice(0, 1).toUpperCase()}</span><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Ajouter un commentaire…" maxLength="2000" rows="3"/><button className="primary-button" disabled={saving || !body.trim()}>{saving ? <LoaderCircle size={15} className="spin"/> : <Send size={15}/>}Envoyer</button></form></section></div>
}

function AnalyticsPage({ analytics }) { return <section className="content-area product-page"><div className="page-title-row"><div><span className="eyebrow">PERFORMANCES</span><h1>Les résultats vérifiés.</h1><p>Les statistiques détaillées seront disponibles lorsque les plateformes renverront leurs insights.</p></div></div><div className="metric-grid analytics-metrics"><Metric icon={Send} value={analytics?.published || 0} label="livraisons confirmées"/><Metric icon={Eye} value="—" label="portée synchronisée"/><Metric icon={Heart} value="—" label="interactions synchronisées"/></div><div className="surface analytics-empty"><BarMessage/><h2>{analytics?.metricsAvailable ? 'Données synchronisées' : 'Insights non disponibles'}</h2><p>Relay affiche ici uniquement les métriques retournées par les API des plateformes. Connectez les applications OAuth dans n8n puis activez leurs nœuds de récupération d’insights.</p>{analytics?.byPlatform?.length ? <div className="delivery-summary">{analytics.byPlatform.map((item) => <span key={item.platform}>{platformMeta[item.platform]?.label} · {item.published} livraison{item.published > 1 ? 's' : ''}</span>)}</div> : null}</div></section> }
function BarMessage() { return <span className="metric-icon"><Grid2X2 size={18}/></span> }

function SettingsPage({ connections, session, onSignedOut }) {
  const openN8n = () => window.open(N8N_URL, '_blank', 'noopener,noreferrer')
  const beginOAuth = async (provider) => {
    const { authorizationUrl } = await request(`/v1/auth/${provider}?workspaceId=${encodeURIComponent(WORKSPACE_ID)}`, { method: 'POST' })
    window.location.assign(authorizationUrl)
  }
  const connectInstagram = () => { beginOAuth('instagram').catch((error) => window.alert(error.message)) }
  const connectX = () => { beginOAuth('x').catch((error) => window.alert(error.message)) }
  return <section className="content-area product-page settings-page"><div className="page-title-row"><div><span className="eyebrow">CONNEXIONS</span><h1>Vos canaux de diffusion.</h1><p>Un compte n’est indiqué comme connecté qu’après une autorisation OAuth valide.</p></div></div><div className="surface account-card"><span className="metric-icon"><ShieldCheck size={17}/></span><div><b>{session.email}</b><p>Accès {session.role === 'owner' ? 'administrateur' : 'membre'} à l’espace Relay.</p></div><button className="secondary-button" onClick={async () => { await request('/v1/auth/session', { method: 'DELETE' }); onSignedOut() }}><LogOut size={14}/>Se déconnecter</button></div>{session.role === 'owner' && <TeamPanel />}<div className="connection-callout"><span className="metric-icon"><Camera size={17}/></span><div><b>Connectez Instagram depuis Relay</b><p>Vous vous authentifiez directement auprès d’Instagram. Relay chiffre le jeton de connexion ; n8n sert ensuite à exécuter les publications planifiées.</p></div><button className="secondary-button" onClick={connectInstagram}>Connecter Instagram <ArrowUpRight size={14}/></button></div><div className="surface settings-card"><div className="section-title"><div><span className="eyebrow">RÉSEAUX SOCIAUX</span><h2>État des connexions.</h2></div></div>{connections.map((connection) => { const meta = platformMeta[connection.platform]; const Icon = meta.icon; const directOAuth = connection.platform === 'instagram' || connection.platform === 'x'; const action = connection.platform === 'instagram' ? connectInstagram : connection.platform === 'x' ? connectX : openN8n; return <div className="connection-row" key={connection.platform}><span className="network-logo" style={{ color: meta.color, background: meta.bg }}><Icon size={18}/></span><div><b>{meta.label}</b><small>{connection.connected ? connection.accountName || 'Compte autorisé' : 'Aucune autorisation OAuth enregistrée'}</small></div><span className={connection.connected ? 'connected-label' : 'pending-label'}>{connection.connected ? 'Connecté' : 'À configurer'}</span><button className="connection-action" onClick={action}>{connection.connected ? (directOAuth ? 'Reconnecter' : 'Gérer') : (directOAuth ? 'Se connecter' : 'Configurer OAuth')} {directOAuth ? <ArrowUpRight size={13}/> : <ExternalLink size={13}/>}</button></div>})}</div><div className="surface settings-card"><span className="eyebrow">AUTOMATISATION</span><h2>n8n</h2><p className="quiet-copy">La file de publication transmet les médias programmés au webhook n8n. Les jetons Instagram et X sont chiffrés dans Relay, puis fournis au workflow uniquement lors de l’exécution.</p><button className="text-button settings-n8n-link" onClick={openN8n}>Ouvrir n8n <ArrowUpRight size={14}/></button></div></section>
}


function TeamPanel() {
  const [members, setMembers] = useState([]); const [email, setEmail] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const load = async () => { try { setMembers(await request('/v1/team')) } catch (cause) { setError(cause.message) } }
  useEffect(() => { load() }, [])
  const invite = async (event) => { event.preventDefault(); setError(''); setSaving(true); try { await request('/v1/team', { method: 'POST', body: JSON.stringify({ email, role: 'member' }) }); setEmail(''); await load() } catch (cause) { setError(cause.message) } finally { setSaving(false) } }
  return <section className="surface team-card"><div className="section-title"><div><span className="eyebrow">ÉQUIPE</span><h2>Accès au back-office.</h2></div><Users size={18}/></div><p className="quiet-copy">Ajoutez une adresse autorisée. La personne choisira son mot de passe à sa première connexion.</p><form className="team-add" onSubmit={invite}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="membre@entreprise.com" required /><button className="secondary-button" disabled={saving}><Plus size={14}/>{saving ? 'Ajout…' : 'Ajouter'}</button></form>{error && <p className="team-error">{error}</p>}<div className="team-list">{members.map((member) => <div className="team-member" key={member.id}><span className="team-avatar">{member.email.slice(0, 1).toUpperCase()}</span><span><b>{member.email}</b><small>{member.role === 'owner' ? 'Administrateur' : 'Membre'} · {member.passwordInitialized ? 'Compte activé' : 'En attente de première connexion'}</small></span><span className={member.passwordInitialized ? 'connected-label' : 'pending-label'}>{member.passwordInitialized ? 'Actif' : 'En attente'}</span></div>)}</div></section>
}

function Composer({ assets, refresh, onClose, onCreated }) {
  const [selectedAsset, setSelectedAsset] = useState(assets[0]?._id || '')
  const [title, setTitle] = useState(''); const [caption, setCaption] = useState(''); const [destinations, setDestinations] = useState([]); const [scheduledAt, setScheduledAt] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  const fileRef = useRef(null)
  const uploadAndSelect = async (file) => { if (!file) return; setSaving(true); setError(''); try { const form = new FormData(); form.append('workspaceId', WORKSPACE_ID); form.append('file', file); const asset = await request('/v1/assets/upload', { method: 'POST', body: form }); await refresh(); setSelectedAsset(asset._id); if (!title) setTitle(asset.name.replace(/\.[^/.]+$/, '')); } catch (cause) { setError(cause.message) } finally { setSaving(false) } }
  const submit = async () => { setError(''); if (!selectedAsset || !title.trim() || !destinations.length || !scheduledAt) { setError('Ajoutez un média, un titre, au moins une destination et une date.'); return } setSaving(true); try { const publication = await request('/v1/publications', { method: 'POST', body: JSON.stringify({ workspaceId: WORKSPACE_ID, assetId: selectedAsset, title: title.trim(), caption, destinations }) }); const scheduled = await request(`/v1/publications/${publication._id}/schedule`, { method: 'POST', body: JSON.stringify({ scheduledAt: new Date(scheduledAt).toISOString() }) }); onClose(); await onCreated(scheduled); } catch (cause) { setError(cause.message) } finally { setSaving(false) } }
  return <div className="modal-backdrop"><div className="composer real-composer"><button className="modal-close" onClick={onClose}><X size={18}/></button><span className="eyebrow">NOUVELLE PUBLICATION</span><h2>Préparez une diffusion.</h2><p>Chaque champ ci-dessous est enregistré dans votre espace MongoDB.</p>{error && <p className="form-error">{error}</p>}<input ref={fileRef} className="visually-hidden" type="file" accept="image/*,video/*" onChange={(event) => uploadAndSelect(event.target.files?.[0])}/><div className="composer-grid"><label>Titre<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Annonce du lancement"/></label><label>Média<select value={selectedAsset} onChange={(event) => setSelectedAsset(event.target.value)}><option value="">Choisir un média</option>{assets.map((asset) => <option value={asset._id} key={asset._id}>{asset.name}</option>)}</select><button className="text-button upload-inline" onClick={() => fileRef.current?.click()}><Upload size={14}/>Importer un nouveau fichier</button></label><label className="span-two">Légende<textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Écrivez la légende qui sera envoyée aux plateformes." rows="4"/></label><label>Planification<input type="datetime-local" min={toLocalInput(Date.now() + 60_000)} value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)}/></label><div><span className="field-label">Destinations</span><div className="channel-selector">{Object.entries(platformMeta).map(([key, meta]) => { const Icon = meta.icon; const enabled = destinations.includes(key); return <button type="button" className={enabled ? 'channel-choice selected' : 'channel-choice'} key={key} onClick={() => setDestinations(enabled ? destinations.filter((item) => item !== key) : [...destinations, key])}><Icon size={15}/>{meta.label}{enabled && <Check size={13}/>}</button> })}</div></div></div><div className="composer-actions"><button className="secondary-button" onClick={onClose}>Annuler</button><button className="primary-button" disabled={saving} onClick={submit}>{saving ? <LoaderCircle size={16} className="spin"/> : <CalendarDays size={16}/>}Programmer</button></div></div></div>
}

function PublicationEditor({ publication, onCancel, onSaved }) {
  const [title, setTitle] = useState(publication.title); const [caption, setCaption] = useState(publication.caption || ''); const [destinations, setDestinations] = useState(publication.destinations); const [scheduledAt, setScheduledAt] = useState(publication.scheduledAt ? toLocalInput(publication.scheduledAt) : ''); const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  const submit = async (event) => { event.preventDefault(); if (!title.trim() || !destinations.length || !scheduledAt) { setError('Ajoutez un titre, une date et au moins une destination.'); return } setSaving(true); setError(''); try { const updated = await request(`/v1/publications/${publication._id}`, { method: 'PATCH', body: JSON.stringify({ workspaceId: WORKSPACE_ID, title: title.trim(), caption, destinations, scheduledAt: new Date(scheduledAt).toISOString() }) }); onSaved(updated) } catch (cause) { setError(cause.message) } finally { setSaving(false) } }
  return <form className="studio-editor" onSubmit={submit}><span className="eyebrow">MODIFIER LA PUBLICATION</span>{error && <p className="form-error">{error}</p>}<label>Titre<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titre de la publication"/></label><label>Planification<input type="datetime-local" min={toLocalInput(Date.now() + 60_000)} value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)}/></label><label>Légende<textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Légende à publier" rows="5"/><small className={destinations.includes('x') && caption.length > 280 ? 'char-count over' : 'char-count'}>{caption.length}{destinations.includes('x') ? ' / 280 sur X' : ''}</small></label><div><span className="field-label">Destinations</span><div className="channel-selector">{Object.entries(platformMeta).map(([key, meta]) => { const Icon = meta.icon; const enabled = destinations.includes(key); return <button type="button" className={enabled ? 'channel-choice selected' : 'channel-choice'} key={key} onClick={() => setDestinations(enabled ? destinations.filter((item) => item !== key) : [...destinations, key])}><Icon size={15}/>{meta.label}{enabled && <Check size={13}/>}</button> })}</div></div><div className="composer-actions"><button type="button" className="secondary-button" onClick={onCancel}>Annuler</button><button className="primary-button" disabled={saving}>{saving ? <LoaderCircle size={16} className="spin"/> : <CalendarDays size={16}/>}Enregistrer</button></div></form>
}

function AssetPreview({ asset, library = false, large = false, thumbnail = false, playable = false, className = '' }) { const classes = `${library ? 'library-art' : 'media-art'} actual-asset ${large ? 'large' : ''} ${className}`; if (!asset) return <div className={`${classes} empty-art`}><Image size={18}/></div>; return <div className={classes}>{asset.kind === 'video' ? <video src={asset.publicUrl} autoPlay={thumbnail} loop={thumbnail} muted={!playable} controls={playable} playsInline preload={thumbnail || playable ? 'auto' : 'metadata'} /> : <img src={asset.publicUrl} alt={asset.name}/>} {asset.kind === 'video' && !playable && <span className="play-art"><Play size={library ? 14 : 12} fill="currentColor"/></span>}</div> }
function NetworkStack({ items }) { return <div className="network-stack">{items.map((name) => { const Icon = platformMeta[name].icon; return <span style={{ color: platformMeta[name].color }} key={name}><Icon size={11}/></span> })}</div> }
function EmptyBlock({ title, copy, action, onAction }) { return <div className="empty-block"><FolderOpen size={25}/><h2>{title}</h2><p>{copy}</p>{action && <button className="primary-button" onClick={onAction}><Plus size={16}/>{action}</button>}</div> }

createRoot(document.getElementById('root')).render(<App />)

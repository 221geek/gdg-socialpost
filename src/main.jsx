import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowUpRight, CalendarDays, Camera, Check, ChevronRight, Clock3, FileVideo,
  FolderOpen, Grid2X2, Image, ImagePlus, LayoutDashboard, LoaderCircle,
  MoreHorizontal, Plus, Search, Send, Settings2, Upload, Video, X, AlertCircle,
  BriefcaseBusiness, Play, RefreshCw, ExternalLink, Eye, Heart
} from 'lucide-react'
import './styles.css'
import './pages.css'
import './type.css'
import './live.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '')
const WORKSPACE_ID = 'default'
const platformMeta = {
  instagram: { label: 'Instagram', icon: Camera, color: '#ef65a4', bg: '#fff0f7' },
  linkedin: { label: 'LinkedIn', icon: BriefcaseBusiness, color: '#2379b5', bg: '#ebf6ff' },
  youtube: { label: 'YouTube', icon: Video, color: '#ea5a4f', bg: '#fff1ef' },
  tiktok: { label: 'TikTok', icon: Play, color: '#111', bg: '#f2f4f3' },
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { ...(options.body instanceof FormData ? {} : { 'content-type': 'application/json' }), ...options.headers } })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Une erreur est survenue.')
  return payload.data
}

const formatDate = (value, withTime = true) => value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', ...(withTime ? { timeStyle: 'short' } : {}) }).format(new Date(value)) : 'Non planifiée'
const mediaType = (asset) => asset?.kind === 'video' ? 'Vidéo' : 'Image'
const statusLabel = { draft: 'Brouillon', scheduled: 'Programmée', dispatching: 'En cours', published: 'Publiée', failed: 'À relancer' }

function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [assets, setAssets] = useState([])
  const [publications, setPublications] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [connections, setConnections] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [selected, setSelected] = useState(null)
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
  useEffect(() => { refresh() }, [])
  const flash = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 3500) }
  const onCreated = async (publication) => { await refresh(); setSelected(publication); setActiveTab('calendar'); flash('Publication enregistrée et programmée.') }
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
      <div className="sidebar-bottom"><Nav icon={Settings2} label="Paramètres" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} /><div className="profile"><span className="avatar">R</span><span><b>Relay</b><small>Workspace par défaut</small></span></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="crumb"><span>Relay</span><ChevronRight size={15}/><b>{pageTitle}</b></div><div className="header-actions"><button className="icon-button" onClick={refresh} aria-label="Actualiser"><RefreshCw size={17}/></button><button className="primary-button" onClick={() => setComposerOpen(true)}><Plus size={18}/>Créer une publication</button></div></header>
      {error && <ApiError message={error} onRetry={refresh} />}
      {!error && loading && <LoadingState />}
      {!error && !loading && activeTab === 'overview' && <OverviewPage dashboard={dashboard} publications={publications} assets={assetMap} connections={connections} setActiveTab={setActiveTab} setComposerOpen={setComposerOpen} />}
      {!error && !loading && activeTab === 'calendar' && <CalendarPage publications={publications} assets={assetMap} onSelect={setSelected} setComposerOpen={setComposerOpen} />}
      {!error && !loading && activeTab === 'media' && <MediaPage assets={assets} refresh={refresh} flash={flash} setComposerOpen={setComposerOpen} />}
      {!error && !loading && activeTab === 'analytics' && <AnalyticsPage analytics={analytics} />}
      {!error && !loading && activeTab === 'settings' && <SettingsPage connections={connections} />}
    </main>
    {activeTab === 'calendar' && selected && <PublicationPanel publication={selected} asset={assetMap.get(selected.assetId)} onClose={() => setSelected(null)} />}
    {composerOpen && <Composer assets={assets} refresh={refresh} onClose={() => setComposerOpen(false)} onCreated={onCreated} />}
    {notice && <div className="toast"><Check size={16}/>{notice}</div>}
  </div>
}

function Nav({ icon: Icon, label, active, onClick }) { return <button className={active ? 'nav-item active' : 'nav-item'} onClick={onClick}><Icon size={18}/>{label}</button> }
function LoadingState() { return <div className="empty-state"><LoaderCircle size={26} className="spin"/><p>Chargement de votre espace…</p></div> }
function ApiError({ message, onRetry }) { return <section className="api-error"><AlertCircle size={20}/><div><b>L’application ne peut pas joindre son API.</b><p>{message}</p><code>VITE_API_URL={API_URL}</code></div><button className="secondary-button" onClick={onRetry}>Réessayer</button></section> }
function Metric({ icon: Icon, value, label }) { return <div className="surface metric"><span className="metric-icon"><Icon size={18}/></span><div className="metric-value">{value}</div><p>{label}</p></div> }

function OverviewPage({ dashboard, publications, assets, connections, setActiveTab, setComposerOpen }) {
  const upcoming = dashboard?.upcoming
  const upcomingAsset = assets.get(upcoming?.assetId)
  return <section className="content-area product-page"><div className="page-title-row"><div><span className="eyebrow">ESPACE DE PUBLICATION</span><h1>Votre contenu, au bon moment.</h1><p>Cette vue reflète uniquement les données enregistrées dans votre espace.</p></div><button className="primary-button" onClick={() => setComposerOpen(true)}><Plus size={17}/>Nouvelle publication</button></div>
    {upcoming ? <div className="overview-hero"><div><span className="eyebrow">PROCHAINE DIFFUSION</span><h2>{upcoming.title}</h2><p>{formatDate(upcoming.scheduledAt)} · {upcoming.destinations.map((key) => platformMeta[key].label).join(', ')}</p><button className="light-action" onClick={() => setActiveTab('calendar')}>Ouvrir les publications <ArrowUpRight size={15}/></button></div><AssetPreview asset={upcomingAsset} className="hero-preview" /></div> : <EmptyBlock title="Aucune publication programmée" copy="Importez un média, préparez sa légende et choisissez sa date de diffusion." action="Créer une publication" onAction={() => setComposerOpen(true)} />}
    <div className="metric-grid"><Metric icon={CalendarDays} value={dashboard?.byStatus?.scheduled || 0} label="publications programmées"/><Metric icon={FolderOpen} value={dashboard?.assets || 0} label="médias importés"/><Metric icon={Camera} value={dashboard?.connections || 0} label="comptes connectés"/></div>
    <div className="overview-lower"><div className="surface activity-card"><div className="section-title"><div><span className="eyebrow">PUBLICATIONS</span><h2>Les dernières activités.</h2></div><button className="text-button" onClick={() => setActiveTab('calendar')}>Tout voir <ArrowUpRight size={14}/></button></div>{publications.length ? publications.slice(0, 5).map((publication) => <div className="activity-row" key={publication._id}><AssetPreview asset={assets.get(publication.assetId)} /><span><b>{publication.title}</b><small>{statusLabel[publication.status]} · {formatDate(publication.scheduledAt)}</small></span><NetworkStack items={publication.destinations}/></div>) : <p className="quiet-copy">Vos publications apparaîtront ici dès leur création.</p>}</div><div className="surface pulse-card"><span className="eyebrow">CONNEXIONS</span><h2>{connections.filter((item) => item.connected).length ? 'Vos canaux actifs.' : 'Aucun canal connecté.'}</h2><p>Les comptes reliés via les identifiants OAuth configurés dans n8n apparaîtront ici.</p><button className="light-action" onClick={() => setActiveTab('settings')}>Voir les connexions <ArrowUpRight size={14}/></button></div></div>
  </section>
}

function CalendarPage({ publications, assets, onSelect, setComposerOpen }) { return <section className="content-area product-page"><div className="page-title-row"><div><span className="eyebrow">CALENDRIER</span><h1>Vos publications.</h1><p>Planifiez vos médias sans dépendre de données de démonstration.</p></div><button className="primary-button" onClick={() => setComposerOpen(true)}><Plus size={17}/>Créer une publication</button></div><div className="surface publication-list"><div className="list-head"><span>CONTENU</span><span>DIFFUSION</span><span>DESTINATIONS</span><span>STATUT</span></div>{publications.length ? publications.map((publication) => <button className="publication-row" key={publication._id} onClick={() => onSelect(publication)}><AssetPreview asset={assets.get(publication.assetId)} /><div><b>{publication.title}</b><small>{assets.get(publication.assetId)?.name || 'Média introuvable'}</small></div><span>{formatDate(publication.scheduledAt)}</span><NetworkStack items={publication.destinations}/><span className={`status status-${publication.status}`}>{statusLabel[publication.status]}</span></button>) : <EmptyBlock title="Votre calendrier est vide" copy="Ajoutez un média et programmez votre première diffusion." action="Créer une publication" onAction={() => setComposerOpen(true)} />}</div></section> }

function MediaPage({ assets, refresh, flash, setComposerOpen }) {
  const inputRef = useRef(null); const [uploading, setUploading] = useState(false); const [query, setQuery] = useState('')
  const upload = async (file) => { if (!file) return; setUploading(true); try { const form = new FormData(); form.append('workspaceId', WORKSPACE_ID); form.append('file', file); await request('/v1/assets/upload', { method: 'POST', body: form }); await refresh(); flash('Média importé.'); } catch (cause) { flash(cause.message) } finally { setUploading(false); if (inputRef.current) inputRef.current.value = '' } }
  const filtered = assets.filter((asset) => asset.name.toLowerCase().includes(query.toLowerCase()))
  return <section className="content-area product-page"><div className="page-title-row"><div><span className="eyebrow">BIBLIOTHÈQUE</span><h1>Vos médias.</h1><p>Les fichiers importés sont stockés par l’API Relay.</p></div><button className="primary-button" onClick={() => inputRef.current?.click()}><Upload size={16}/>{uploading ? 'Import en cours…' : 'Importer un média'}</button></div><input ref={inputRef} className="visually-hidden" type="file" accept="image/*,video/*" onChange={(event) => upload(event.target.files?.[0])}/><div className="media-tools"><div className="media-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un fichier" /></div><span className="filter-chip active">{assets.length} fichier{assets.length > 1 ? 's' : ''}</span></div><div className="media-layout"><button className="upload-tile" onClick={() => inputRef.current?.click()}><ImagePlus size={23}/><b>Ajouter un média</b><span>Images ou vidéos · 2 Go maximum</span></button>{filtered.map((asset) => <article className="media-tile" key={asset._id}><AssetPreview asset={asset} library/><div><b>{asset.name}</b><small>{mediaType(asset)} · importé le {formatDate(asset.createdAt, false)}</small></div></article>)}</div>{!assets.length && <p className="quiet-copy">Aucun média n’a encore été importé.</p>}<button className="floating-composer" onClick={() => setComposerOpen(true)}>Créer depuis la médiathèque</button></section>
}

function AnalyticsPage({ analytics }) { return <section className="content-area product-page"><div className="page-title-row"><div><span className="eyebrow">PERFORMANCES</span><h1>Les résultats vérifiés.</h1><p>Les statistiques détaillées seront disponibles lorsque les plateformes renverront leurs insights.</p></div></div><div className="metric-grid analytics-metrics"><Metric icon={Send} value={analytics?.published || 0} label="livraisons confirmées"/><Metric icon={Eye} value="—" label="portée synchronisée"/><Metric icon={Heart} value="—" label="interactions synchronisées"/></div><div className="surface analytics-empty"><BarMessage/><h2>{analytics?.metricsAvailable ? 'Données synchronisées' : 'Insights non disponibles'}</h2><p>Relay affiche ici uniquement les métriques retournées par les API des plateformes. Connectez les applications OAuth dans n8n puis activez leurs nœuds de récupération d’insights.</p>{analytics?.byPlatform?.length ? <div className="delivery-summary">{analytics.byPlatform.map((item) => <span key={item.platform}>{platformMeta[item.platform]?.label} · {item.published} livraison{item.published > 1 ? 's' : ''}</span>)}</div> : null}</div></section> }
function BarMessage() { return <span className="metric-icon"><Grid2X2 size={18}/></span> }

function SettingsPage({ connections }) { return <section className="content-area product-page settings-page"><div className="page-title-row"><div><span className="eyebrow">CONNEXIONS</span><h1>Vos canaux de diffusion.</h1><p>Un compte n’est indiqué comme connecté qu’après une autorisation OAuth valide.</p></div></div><div className="surface settings-card"><div className="section-title"><div><span className="eyebrow">RÉSEAUX SOCIAUX</span><h2>État des connexions.</h2></div></div>{connections.map((connection) => { const meta = platformMeta[connection.platform]; const Icon = meta.icon; return <div className="connection-row" key={connection.platform}><span className="network-logo" style={{ color: meta.color, background: meta.bg }}><Icon size={18}/></span><div><b>{meta.label}</b><small>{connection.connected ? connection.accountName || 'Compte autorisé' : 'Non connecté'}</small></div><span className={connection.connected ? 'connected-label' : 'pending-label'}>{connection.connected ? 'Connecté' : 'À configurer'}</span></div>})}</div><div className="surface settings-card"><span className="eyebrow">AUTOMATISATION</span><h2>n8n</h2><p className="quiet-copy">La file de publication transmet les médias programmés au webhook n8n. Les identifiants Meta, TikTok, LinkedIn et Google restent chiffrés dans n8n et ne sont jamais stockés dans cette interface.</p></div></section> }

function Composer({ assets, refresh, onClose, onCreated }) {
  const [selectedAsset, setSelectedAsset] = useState(assets[0]?._id || '')
  const [title, setTitle] = useState(''); const [caption, setCaption] = useState(''); const [destinations, setDestinations] = useState([]); const [scheduledAt, setScheduledAt] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  const fileRef = useRef(null)
  const uploadAndSelect = async (file) => { if (!file) return; setSaving(true); setError(''); try { const form = new FormData(); form.append('workspaceId', WORKSPACE_ID); form.append('file', file); const asset = await request('/v1/assets/upload', { method: 'POST', body: form }); await refresh(); setSelectedAsset(asset._id); if (!title) setTitle(asset.name.replace(/\.[^/.]+$/, '')); } catch (cause) { setError(cause.message) } finally { setSaving(false) } }
  const submit = async () => { setError(''); if (!selectedAsset || !title.trim() || !destinations.length || !scheduledAt) { setError('Ajoutez un média, un titre, au moins une destination et une date.'); return } setSaving(true); try { const publication = await request('/v1/publications', { method: 'POST', body: JSON.stringify({ workspaceId: WORKSPACE_ID, assetId: selectedAsset, title: title.trim(), caption, destinations }) }); const scheduled = await request(`/v1/publications/${publication._id}/schedule`, { method: 'POST', body: JSON.stringify({ scheduledAt: new Date(scheduledAt).toISOString() }) }); onClose(); await onCreated(scheduled); } catch (cause) { setError(cause.message) } finally { setSaving(false) } }
  return <div className="modal-backdrop"><div className="composer real-composer"><button className="modal-close" onClick={onClose}><X size={18}/></button><span className="eyebrow">NOUVELLE PUBLICATION</span><h2>Préparez une diffusion.</h2><p>Chaque champ ci-dessous est enregistré dans votre espace MongoDB.</p>{error && <p className="form-error">{error}</p>}<input ref={fileRef} className="visually-hidden" type="file" accept="image/*,video/*" onChange={(event) => uploadAndSelect(event.target.files?.[0])}/><div className="composer-grid"><label>Titre<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Annonce du lancement"/></label><label>Média<select value={selectedAsset} onChange={(event) => setSelectedAsset(event.target.value)}><option value="">Choisir un média</option>{assets.map((asset) => <option value={asset._id} key={asset._id}>{asset.name}</option>)}</select><button className="text-button upload-inline" onClick={() => fileRef.current?.click()}><Upload size={14}/>Importer un nouveau fichier</button></label><label className="span-two">Légende<textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Écrivez la légende qui sera envoyée aux plateformes." rows="4"/></label><label>Planification<input type="datetime-local" min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)} value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)}/></label><div><span className="field-label">Destinations</span><div className="channel-selector">{Object.entries(platformMeta).map(([key, meta]) => { const Icon = meta.icon; const enabled = destinations.includes(key); return <button type="button" className={enabled ? 'channel-choice selected' : 'channel-choice'} key={key} onClick={() => setDestinations(enabled ? destinations.filter((item) => item !== key) : [...destinations, key])}><Icon size={15}/>{meta.label}{enabled && <Check size={13}/>}</button> })}</div></div></div><div className="composer-actions"><button className="secondary-button" onClick={onClose}>Annuler</button><button className="primary-button" disabled={saving} onClick={submit}>{saving ? <LoaderCircle size={16} className="spin"/> : <CalendarDays size={16}/>}Programmer</button></div></div></div>
}

function PublicationPanel({ publication, asset, onClose }) { return <aside className="detail-panel"><div className="detail-head"><span>APERÇU</span><button className="icon-button" onClick={onClose}><X size={17}/></button></div><AssetPreview asset={asset} large/><div className="detail-copy"><div className="detail-status"><span className="status-dot"></span>{statusLabel[publication.status]?.toUpperCase()}</div><h2>{publication.title}</h2><p>{publication.caption || 'Aucune légende ajoutée.'}</p></div><div className="publish-box"><span className="eyebrow">PUBLICATION</span><div className="publish-date"><CalendarDays size={17}/><span><b>{formatDate(publication.scheduledAt)}</b><small>Heure locale du navigateur</small></span></div></div><div className="destination-list"><span className="eyebrow">DESTINATIONS</span>{publication.destinations.map((name) => { const meta = platformMeta[name]; const Icon = meta.icon; return <div className="destination" key={name}><span className="network-logo" style={{ color: meta.color, background: meta.bg }}><Icon size={17}/></span><span><b>{meta.label}</b><small>En attente de la file n8n</small></span></div> })}</div></aside> }
function AssetPreview({ asset, library = false, large = false, className = '' }) { const classes = `${library ? 'library-art' : 'media-art'} actual-asset ${large ? 'large' : ''} ${className}`; if (!asset) return <div className={`${classes} empty-art`}><Image size={18}/></div>; return <div className={classes}>{asset.kind === 'video' ? <video src={asset.publicUrl} muted preload="metadata" /> : <img src={asset.publicUrl} alt={asset.name}/>} {asset.kind === 'video' && <span className="play-art"><Play size={library ? 14 : 12} fill="currentColor"/></span>}</div> }
function NetworkStack({ items }) { return <div className="network-stack">{items.map((name) => { const Icon = platformMeta[name].icon; return <span style={{ color: platformMeta[name].color }} key={name}><Icon size={11}/></span> })}</div> }
function EmptyBlock({ title, copy, action, onAction }) { return <div className="empty-block"><FolderOpen size={25}/><h2>{title}</h2><p>{copy}</p>{action && <button className="primary-button" onClick={onAction}><Plus size={16}/>{action}</button>}</div> }

createRoot(document.getElementById('root')).render(<App />)

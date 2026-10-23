import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowUpRight, Bell, CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, Clock3, Command, FileVideo, FolderOpen, Grid2X2, Image,
  Camera, LayoutDashboard, BriefcaseBusiness, Menu, MoreHorizontal, Plus, Search,
  Send, Settings2, Sparkles, Upload, Video, X, Check, Play, Filter,
  BarChart3, ArrowDownRight, ArrowUp, Eye, Heart, ImagePlus, Link2, Trash2,
  UsersRound, WandSparkles
} from 'lucide-react'
import './styles.css'
import './pages.css'
import './type.css'

const network = {
  instagram: { label: 'Instagram', icon: Camera, color: '#ef65a4', bg: '#fff0f7' },
  linkedin: { label: 'LinkedIn', icon: BriefcaseBusiness, color: '#2379b5', bg: '#ebf6ff' },
  youtube: { label: 'YouTube', icon: Video, color: '#ea5a4f', bg: '#fff1ef' },
  tiktok: { label: 'TikTok', icon: Play, color: '#111', bg: '#f2f4f3' },
}

const posts = [
  { id: 1, title: 'La méthode qui change tout', time: '09:30', day: 0, networks: ['instagram', 'linkedin'], type: 'image', color: 'lime', media: 'MÉTHODE' },
  { id: 2, title: 'Behind the scenes — épisode 04', time: '12:00', day: 1, networks: ['tiktok', 'youtube'], type: 'video', color: 'blue', media: 'BTS' },
  { id: 3, title: 'Ce qu’on prépare pour novembre', time: '18:30', day: 2, networks: ['linkedin'], type: 'image', color: 'orange', media: 'NOV.' },
  { id: 4, title: 'Un aperçu de la prochaine collection', time: '10:00', day: 4, networks: ['instagram', 'tiktok'], type: 'video', color: 'pink', media: 'NEW' },
  { id: 5, title: 'Les 3 idées à retenir', time: '17:00', day: 6, networks: ['instagram', 'linkedin', 'youtube'], type: 'image', color: 'violet', media: '03' },
]

const mediaItems = [
  { name: 'summer-campaign.mp4', type: 'video', color: 'pink', duration: '00:24' },
  { name: 'studio-portrait.jpg', type: 'image', color: 'orange' },
  { name: 'new-product.webp', type: 'image', color: 'lime' },
]

function App() {
  const [activeTab, setActiveTab] = useState('calendar')
  const [selectedPost, setSelectedPost] = useState(posts[0])
  const [composerOpen, setComposerOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [scheduled, setScheduled] = useState(posts)
  const [channels, setChannels] = useState(['instagram', 'linkedin'])
  const [query, setQuery] = useState('')

  const days = [
    ['Lun', '14'], ['Mar', '15'], ['Mer', '16'], ['Jeu', '17'], ['Ven', '18'], ['Sam', '19'], ['Dim', '20']
  ]
  const filteredMedia = useMemo(() => mediaItems.filter((m) => m.name.includes(query.toLowerCase())), [query])

  function flash(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2500)
  }
  function addPost() {
    const newPost = { id: Date.now(), title: 'Nouvelle publication', time: '14:00', day: 3, networks: channels, type: 'image', color: 'blue', media: 'DRAFT' }
    setScheduled([...scheduled, newPost])
    setSelectedPost(newPost)
    setComposerOpen(false)
    flash('Publication ajoutée au calendrier')
  }

  const pageTitle = { overview: 'Vue d’ensemble', calendar: 'Calendrier', media: 'Médiathèque', analytics: 'Performances', settings: 'Paramètres' }[activeTab]
  return <div className={'app-shell ' + (activeTab === 'calendar' ? '' : 'wide-shell')}>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">R</span><span>relay</span></div>
      <div className="workspace-switcher"><span className="avatar-small">N</span><span>Nouvelle Vague</span><ChevronDown size={14}/></div>
      <nav className="main-nav">
        <button className={activeTab === 'overview' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('overview')}><LayoutDashboard size={18}/>Vue d’ensemble</button>
        <button className={activeTab === 'calendar' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('calendar')}><CalendarDays size={18}/>Publications</button>
        <button className={activeTab === 'media' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('media')}><FolderOpen size={18}/>Médiathèque</button>
        <button className={activeTab === 'analytics' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('analytics')}><Grid2X2 size={18}/>Performances</button>
      </nav>
      <div className="sidebar-label">ESPACES</div>
      <div className="space-line"><span className="space-dot coral"></span> Contenu organique <span className="space-count">12</span></div>
      <div className="space-line"><span className="space-dot mint"></span> Lancements <span className="space-count">4</span></div>
      <div className="sidebar-bottom">
        <button className={activeTab === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('settings')}><Settings2 size={18}/>Paramètres</button>
        <button className="profile"><span className="avatar">NM</span><span><b>Nora Michel</b><small>Admin</small></span><MoreHorizontal size={17}/></button>
      </div>
    </aside>

    <main className="main-content">
      <header className="topbar">
        <div className="crumb"><span>Relay</span><ChevronRight size={15}/><b>{pageTitle}</b></div>
        <div className="header-actions"><button className="icon-button search-btn"><Search size={18}/><span>Rechercher</span><kbd>⌘ K</kbd></button><button className="icon-button"><Bell size={18}/></button><button className="primary-button" onClick={() => setComposerOpen(true)}><Plus size={18}/>Créer une publication</button></div>
      </header>

      {activeTab === 'calendar' && <CalendarPage days={days} scheduled={scheduled} setSelectedPost={setSelectedPost} setComposerOpen={setComposerOpen} flash={flash}/>} 
      {activeTab === 'overview' && <OverviewPage scheduled={scheduled} setActiveTab={setActiveTab} setComposerOpen={setComposerOpen}/>} 
      {activeTab === 'media' && <MediaPage query={query} setQuery={setQuery} items={filteredMedia} setComposerOpen={setComposerOpen} flash={flash}/>} 
      {activeTab === 'analytics' && <AnalyticsPage/>} 
      {activeTab === 'settings' && <SettingsPage flash={flash}/>} 
    </main>

    {activeTab === 'calendar' && <aside className="detail-panel">
      <div className="detail-head"><span>APERÇU</span><button className="icon-button" onClick={() => setSelectedPost(null)}><X size={17}/></button></div>
      {selectedPost ? <>
        <div className={'preview-art ' + selectedPost.color}><MediaArt post={selectedPost} large/></div>
        <div className="detail-copy"><div className="detail-status"><span className="status-dot"></span>PROGRAMMÉ</div><h2>{selectedPost.title}</h2><p>Un contenu pensé pour rester simple, juste et mémorable. Retrouvez-nous pour la suite.</p><button className="see-caption">Voir la légende <ChevronDown size={14}/></button></div>
        <div className="publish-box"><span className="eyebrow">PUBLICATION</span><div className="publish-date"><CalendarDays size={17}/><span><b>lun. 14 oct. à {selectedPost.time}</b><small>Heure locale · Dakar</small></span><button className="edit-link" onClick={() => setComposerOpen(true)}>Modifier</button></div></div>
        <div className="destination-list"><span className="eyebrow">DESTINATIONS</span>{selectedPost.networks.map(n => { const item = network[n]; const I = item.icon; return <div className="destination" key={n}><span className="network-logo" style={{color:item.color,background:item.bg}}><I size={17}/></span><span><b>{item.label}</b><small>Nouvelle Vague</small></span><Check size={16} className="destination-check"/></div>})}</div>
        <div className="detail-foot"><button className="secondary-button" onClick={() => flash('Brouillon dupliqué')}>Dupliquer</button><button className="primary-button full" onClick={() => flash('Publication prête à être envoyée')}><Send size={16}/>Publier maintenant</button></div>
      </> : <div className="empty-detail"><Sparkles size={26}/><p>Sélectionnez une publication pour l’ouvrir.</p></div>}
    </aside>}

    {composerOpen && <div className="modal-backdrop" onMouseDown={() => setComposerOpen(false)}><div className="composer" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setComposerOpen(false)}><X size={18}/></button><span className="eyebrow">NOUVELLE PUBLICATION</span><h2>Donnez le départ.</h2><p>Ajoutez votre média, choisissez ses destinations et programmez sa diffusion.</p><div className="drop-zone"><Upload size={22}/><b>Déposez un média ici</b><span>ou parcourez vos fichiers · JPG, PNG, MP4</span><button className="browse-button">Parcourir la médiathèque</button></div><div className="form-row"><div><label>Diffuser sur</label><div className="channel-selector">{Object.entries(network).map(([key, item]) => {const I=item.icon; const on=channels.includes(key); return <button className={on?'channel-choice selected':'channel-choice'} key={key} onClick={() => setChannels(on ? channels.filter(n=>n!==key):[...channels,key])}><I size={15}/>{item.label}{on&&<Check size={13}/>}</button>})}</div></div><div className="schedule-field"><label>Planification</label><button><CalendarDays size={16}/>14 oct. · 14:00<ChevronDown size={14}/></button></div></div><div className="composer-actions"><button className="secondary-button" onClick={() => setComposerOpen(false)}>Annuler</button><button className="primary-button" onClick={addPost}><CalendarDays size={16}/>Ajouter au calendrier</button></div></div></div>}
    {notice && <div className="toast"><Check size={16}/>{notice}</div>}
  </div>
}

function CalendarPage({ days, scheduled, setSelectedPost, setComposerOpen, flash }) {
  return <section className="content-area">
    <div className="page-title-row"><div><h1>Le rythme de la semaine.</h1><p>Planifiez, visualisez et gardez le fil de vos contenus.</p></div><div className="week-tools"><button className="today-btn">Aujourd’hui</button><div className="date-jump"><ChevronLeft size={17}/><span>14 — 20 oct. 2024</span><ChevronRight size={17}/></div><button className="view-toggle"><span className="view-icon"><Grid2X2 size={14}/></span>Semaine<ChevronDown size={14}/></button></div></div>
    <div className="surface calendar-surface"><div className="calendar-toolbar"><div className="filters"><button className="filter-chip active"><span className="all-dot"></span>Tous les canaux<ChevronDown size={13}/></button><button className="filter-chip"><Filter size={13}/>Filtrer</button></div><div className="timezone"><Clock3 size={14}/> GMT+0 · Dakar</div></div><div className="calendar-grid"><div className="time-column"><div className="day-head spacer"></div>{['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(time => <div className="hour-label" key={time}>{time}</div>)}</div>{days.map(([day, date], index) => <div className={'day-column ' + (index === 0 ? 'today-col' : '')} key={date}><div className="day-head"><span>{day}</span><b className={index === 0 ? 'today-date' : ''}>{date}</b></div><div className="day-lines">{Array.from({length: 10}).map((_, i) => <div key={i} className="hour-line"></div>)}</div>{scheduled.filter(p => p.day === index).map(p => <button onClick={() => setSelectedPost(p)} className={'post-card ' + p.color + ' post-' + p.time.replace(':', '')} key={p.id}><MediaArt post={p}/><div className="post-info"><span className="post-time">{p.time}</span><strong>{p.title}</strong><NetworkStack items={p.networks}/></div></button>)}{index === 3 && <button className="add-slot" onClick={() => setComposerOpen(true)}><Plus size={15}/> Ajouter</button>}</div>)}</div></div>
    <section className="bottom-grid"><div className="surface channel-card"><div className="section-title"><div><span className="eyebrow">CANAL DE DIFFUSION</span><h2>Tout est connecté.</h2></div><button className="text-button" onClick={() => flash('Ouverture des connexions')}>Gérer <ArrowUpRight size={14}/></button></div><p>Vos plateformes sont prêtes à recevoir vos prochains contenus.</p><div className="network-row">{Object.entries(network).map(([key, item]) => { const I = item.icon; return <div className="network-tile" key={key}><span className="network-logo" style={{color:item.color, background:item.bg}}><I size={18}/></span><span>{item.label}</span><i className="connected"><Check size={11}/></i></div>})}</div></div><div className="surface stat-card"><div className="stat-top"><span className="eyebrow">AU PROGRAMME</span><button className="more"><MoreHorizontal size={18}/></button></div><div className="big-stat">12 <span>contenus</span></div><div className="stat-track"><span style={{width:'65%'}}></span></div><p>7 publications prêtes <span>·</span> 5 brouillons</p></div></section>
  </section>
}

function OverviewPage({ scheduled, setActiveTab, setComposerOpen }) {
  return <section className="content-area product-page"><div className="page-title-row"><div><span className="eyebrow">LUNDI 14 OCTOBRE</span><h1>Bonjour, Nora.</h1><p>Ton contenu est en ordre. Voici ce qui mérite ton attention.</p></div><button className="primary-button" onClick={() => setComposerOpen(true)}><Plus size={17}/>Nouvelle publication</button></div><div className="overview-hero"><div><span className="eyebrow">LA PROCHAINE DIFFUSION</span><h2>La méthode qui change tout</h2><p>Aujourd’hui à 09:30 · Instagram & LinkedIn</p><button className="light-action" onClick={() => setActiveTab('calendar')}>Ouvrir le calendrier <ArrowUpRight size={15}/></button></div><div className="hero-orbit"><span></span><span></span><span></span><b>09:30</b></div></div><div className="metric-grid"><Metric icon={CalendarDays} value={scheduled.length} label="publications cette semaine" change="+3 vs. semaine dernière"/><Metric icon={Eye} value="24,8k" label="personnes atteintes" change="+18,4 % ce mois" positive/><Metric icon={Heart} value="8,2 %" label="taux d’engagement" change="Dans votre moyenne haute" positive/></div><div className="overview-lower"><div className="surface activity-card"><div className="section-title"><div><span className="eyebrow">À TRAITER</span><h2>Le fil des publications.</h2></div><button className="text-button" onClick={() => setActiveTab('calendar')}>Tout voir <ArrowUpRight size={14}/></button></div>{scheduled.slice(0,3).map(p => <button className="activity-row" key={p.id} onClick={() => setActiveTab('calendar')}><MediaArt post={p}/><span><b>{p.title}</b><small>Programmé à {p.time}</small></span><NetworkStack items={p.networks}/><ChevronRight size={17}/></button>)}</div><div className="surface pulse-card"><span className="eyebrow">PULSE DU COMPTE</span><h2>La régularité porte ses fruits.</h2><p>Votre audience a le plus réagi aux formats vidéo courts cette semaine.</p><div className="pulse-bars">{[42,65,48,82,60,94,77].map((h,i)=><i style={{height:h+'%'}} key={i}></i>)}</div><span className="pulse-note"><ArrowUp size={14}/> 18 % d’engagement vidéo</span></div></div></section>
}

function Metric({ icon: Icon, value, label, change, positive }) { return <div className="surface metric"><span className="metric-icon"><Icon size={18}/></span><div className="metric-value">{value}</div><p>{label}</p><small className={positive?'is-positive':''}>{positive && <ArrowUp size={11}/>} {change}</small></div> }

function MediaPage({ query, setQuery, items, setComposerOpen, flash }) { const collection = [...items, { name:'recap-october.mov', type:'video', color:'blue', duration:'01:12' }, { name:'quote-cards.png', type:'image', color:'violet' }, { name:'founders-note.jpg', type:'image', color:'orange' }]; return <section className="content-area product-page"><div className="page-title-row"><div><span className="eyebrow">BIBLIOTHÈQUE</span><h1>Vos médias, à portée de main.</h1><p>Conservez les contenus prêts à être diffusés.</p></div><button className="primary-button" onClick={() => setComposerOpen(true)}><Upload size={16}/>Importer un média</button></div><div className="media-tools"><div className="media-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un fichier"/></div><button className="filter-chip active">Tous <span>24</span></button><button className="filter-chip"><Image size={14}/>Images</button><button className="filter-chip"><FileVideo size={14}/>Vidéos</button><button className="sort-button">Ajout récent <ChevronDown size={14}/></button></div><div className="media-layout"><button className="upload-tile" onClick={() => setComposerOpen(true)}><ImagePlus size={23}/><b>Ajouter un média</b><span>JPG, PNG, MP4 jusqu’à 2 Go</span></button>{collection.map((m,i)=><article className="media-tile" key={m.name}><div className={'library-art '+m.color}><span></span><b>{m.name.split('.')[0].slice(0,8).toUpperCase()}</b>{m.type==='video'&&<i><Play size={14} fill="currentColor"/></i>}</div><div><b>{m.name}</b><small>{m.type==='video' ? 'Vidéo · '+m.duration : 'Image · 4.8 Mo'}</small></div><button className="tile-menu" onClick={()=>flash('Options de '+m.name)}><MoreHorizontal size={17}/></button></article>)}</div></section> }

function AnalyticsPage() { return <section className="content-area product-page"><div className="page-title-row"><div><span className="eyebrow">RAPPORT · OCTOBRE</span><h1>Ce qui trouve son public.</h1><p>La vue consolidée de vos quatre canaux.</p></div><button className="today-btn"><CalendarDays size={15}/>1 — 20 oct. 2024 <ChevronDown size={14}/></button></div><div className="metric-grid analytics-metrics"><Metric icon={UsersRound} value="24,8k" label="portée totale" change="+18,4 % vs. septembre" positive/><Metric icon={Heart} value="1 948" label="interactions" change="+12,8 % vs. septembre" positive/><Metric icon={Send} value="312" label="partages et enregistrements" change="+6,2 % vs. septembre" positive/></div><div className="chart-grid"><div className="surface chart-card"><div className="section-title"><div><span className="eyebrow">ÉVOLUTION</span><h2>Portée quotidienne</h2></div><span className="chart-total">24 841 <small>personnes</small></span></div><div className="line-chart"><svg viewBox="0 0 720 220" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c8ef51" stopOpacity=".38"/><stop offset="1" stopColor="#c8ef51" stopOpacity="0"/></linearGradient></defs><path d="M0 184 C54 170 69 150 118 157 S178 115 225 130 S290 152 337 105 S404 79 450 102 S515 146 560 82 S636 50 720 18 L720 220 L0 220Z" fill="url(#fill)"/><path d="M0 184 C54 170 69 150 118 157 S178 115 225 130 S290 152 337 105 S404 79 450 102 S515 146 560 82 S636 50 720 18" fill="none" stroke="#557962" strokeWidth="3"/></svg><div className="chart-days"><span>01 oct.</span><span>05 oct.</span><span>10 oct.</span><span>15 oct.</span><span>20 oct.</span></div></div></div><div className="surface best-card"><span className="eyebrow">MEILLEUR FORMAT</span><div className="best-poster">LE<br/>MOUVE<br/>MENT</div><h2>Le mouvement en 30 secondes</h2><p>Vidéo · Instagram Reels</p><div><span>12,4 k vues</span><span>9,8 % engagement</span></div></div></div><div className="surface channel-performance"><div className="section-title"><div><span className="eyebrow">PAR CANAL</span><h2>Où votre contenu avance.</h2></div></div>{Object.entries(network).map(([key, item],i)=>{const I=item.icon; return <div className="performance-row" key={key}><span className="network-logo" style={{color:item.color,background:item.bg}}><I size={17}/></span><b>{item.label}</b><div><span style={{width:[84,61,48,73][i]+'%',background:item.color}}></span></div><strong>{[12400,6810,3220,5910][i].toLocaleString('fr-FR')}</strong><small className="is-positive">+{[24,12,8,17][i]}%</small></div>})}</div></section> }

function SettingsPage({ flash }) { return <section className="content-area product-page settings-page"><div className="page-title-row"><div><span className="eyebrow">ESPACE DE TRAVAIL</span><h1>Gardez la main sur Relay.</h1><p>Gérez les comptes, l’automatisation et les préférences de l’équipe.</p></div></div><div className="settings-layout"><div className="settings-nav"><button className="settings-active">Général</button><button>Canaux connectés <span>4</span></button><button>Équipe <span>3</span></button><button>Automatisations</button><button>Notifications</button></div><div><div className="surface settings-card"><div className="section-title"><div><span className="eyebrow">IDENTITÉ</span><h2>Votre espace.</h2></div><button className="text-button" onClick={()=>flash('Modifications enregistrées')}>Enregistrer</button></div><div className="workspace-profile"><span className="workspace-avatar">N</span><div><b>Nouvelle Vague</b><small>Créé le 02 septembre 2024</small></div><button className="secondary-button">Changer l’icône</button></div><label className="setting-label">Nom de l’espace<input defaultValue="Nouvelle Vague"/></label><label className="setting-label">Fuseau horaire<select defaultValue="Dakar"><option>Dakar — GMT+0</option><option>Paris — GMT+2</option><option>Abidjan — GMT+0</option></select></label></div><div className="surface settings-card"><span className="eyebrow">AUTOMATISATION</span><div className="automation-row"><div><b>File de publication</b><small>Relay publie selon l’heure programmée et relance automatiquement les tentatives échouées.</small></div><button className="switch on" onClick={(e)=>e.currentTarget.classList.toggle('on')}><i></i></button></div><div className="automation-row"><div><b>Résumé hebdomadaire</b><small>Recevez le bilan de vos contenus chaque lundi matin.</small></div><button className="switch" onClick={(e)=>e.currentTarget.classList.toggle('on')}><i></i></button></div></div><button className="danger-zone" onClick={()=>flash('Aucune donnée supprimée')}><Trash2 size={16}/>Supprimer l’espace de travail</button></div></div></section> }

function NetworkStack({items}) { return <div className="network-stack">{items.map((name) => {const N = network[name].icon; return <span style={{color:network[name].color}} key={name}><N size={11}/></span>})}</div> }
function MediaArt({post, large = false}) { return <div className={'media-art ' + post.color + (large ? ' large' : '')}><span className="art-glow"></span><span className="art-grid"></span><b>{post.media}</b>{post.type === 'video' && <span className="play-art"><Play size={large ? 19 : 11} fill="currentColor"/></span>}</div> }

createRoot(document.getElementById('root')).render(<App />)

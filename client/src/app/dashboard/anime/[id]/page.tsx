'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getAnimeDetails } from '../../../../lib/anilist';
import Image from 'next/image';
import Link from 'next/link';
import { NexoAlert } from '../../../../components/ui/NexoAlert';
import { AnimeSocialFeed } from '../../../../components/anime/AnimeSocialFeed';
import { Users, BookOpen } from 'lucide-react';
import { translateStatus, translateSeason, translateFormat, translateGenre, stripHtml } from '../../../../lib/translations';

type TabType = 'overview' | 'characters' | 'staff' | 'stats' | 'social' | 'manga';

export default function AnimeDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const router = useRouter();
  const [anime, setAnime] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [visibleChars, setVisibleChars] = useState(50);
  const [syncing, setSyncing] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [addingToCollection, setAddingToCollection] = useState(false);
  const [mangaId, setMangaId] = useState<string | null>(null);
  const [checkingManga, setCheckingManga] = useState(true);
  const [compareSearchQuery, setCompareSearchQuery] = useState('');
  const [compareResults, setCompareResults] = useState<any[]>([]);
  const [comparingAnime, setComparingAnime] = useState<any | null>(null);
  const [isSearchingCompare, setIsSearchingCompare] = useState(false);

  useEffect(() => {
    const loadData = async (force: boolean = false) => {
      try {
        if (!params?.id) return;
        const realId = params.id.split('-')[0];
        const data = await getAnimeDetails(realId, force);
        
        if (!data) {
          setError('El anime no existe en esta línea temporal.');
          setLoading(false);
          return;
        }
        setAnime(data);
        setLoading(false);

        // Buscar manga correspondiente en MangaDex a través de nuestro proxy
        const titleToSearch = data.title?.english || data.title?.romaji;
        if (titleToSearch) {
          setCheckingManga(true);
          try {
            const searchRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/manga/search?q=${encodeURIComponent(titleToSearch)}&limit=1`);
            const searchJson = await searchRes.json();
            if (searchJson.success && searchJson.data?.length > 0) {
              // Hacemos una validación de título simple para evitar falsos positivos groseros
              const foundManga = searchJson.data[0];
              setMangaId(foundManga.id);
            }
          } catch (e) {
            console.error('Error checking manga availability:', e);
          } finally {
            setCheckingManga(false);
          }
        } else {
          setCheckingManga(false);
        }

        // Registrar vista en el historial
        const token = localStorage.getItem('token');
        if (token) {
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/anime/discovery/track-view`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ animeId: Number(realId) })
          }).catch(err => console.error('Error tracking view:', err));
        }
      } catch (err) {
        setError('Error al conectar con el Nexo.');
        setLoading(false);
      }
    };
    loadData();
  }, [params.id]);

   if (loading) return (
     <div className="loading-container">
       <div className="nexo-spinner" />
       <p>Sincronizando ADN del Anime...</p>
       <style jsx>{`
         .loading-container { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #050505; color: #00E5FF; gap: 20px; font-weight: 900; letter-spacing: 2px; }
         .nexo-spinner {
           width: 50px;
           height: 50px;
           border: 3px solid rgba(0, 229, 255, 0.1);
           border-top: 3px solid #00E5FF;
           border-radius: 50%;
           animation: spin 1s linear infinite;
         }
         @keyframes spin {
           to { transform: rotate(360deg); }
         }
       `}</style>
     </div>
   );

  if (error || !anime) return (
    <>
      <NexoAlert show={true} type="error" title="ERROR DIMENSIONAL" message={error || "Anime no encontrado"} onClose={() => window.location.href = '/dashboard'} />
      <div style={{ background: '#050505', height: '100vh' }} />
    </>
  );

  const title = anime.title.english || anime.title.romaji;
  const studio = anime.studios.nodes[0]?.name || 'Estudio Desconocido';

  const tabs: { id: TabType; label: string; icon?: string }[] = [
    { id: 'overview', label: 'Vista General' },
    { id: 'characters', label: 'Personajes' },
    { id: 'staff', label: 'Staff' },
    { id: 'stats', label: 'Estadísticas' },
    { id: 'social', label: 'Social' },
    { id: 'manga', label: '📖 Leer Manga' },
  ];

  return (
    <div className="anime-page">
      {/* HERO SECTION */}
      <div className="banner-section" data-tour="anime-header">
        <div className="banner-wrapper">
          {anime.bannerImage ? <Image src={anime.bannerImage} alt={title} fill priority className="banner-img" /> : <div className="banner-placeholder" />}
          <div className="banner-overlay" />
        </div>
        <div className="header-content-box">
          <div className="poster-main">
            <Image src={anime.coverImage.extraLarge} alt={title} fill className="poster-img" />
          </div>
<div className="header-text-main">
             <h1 className="anime-title-h1" data-tour="anime-title">{title}</h1>
             <div className="quick-tags">
               <span className="q-tag">{translateSeason(anime.season)} {anime.seasonYear}</span>
               <span className="q-tag">{translateFormat(anime.type)}</span>
               <span className="q-tag score">⭐ {anime.averageScore}%</span>
             </div>
           </div>
           
           {/* Action Buttons */}
           <div className="anime-actions" data-tour="anime-actions">
             <button 
               className="btn-create-group"
               onClick={() => setShowGroupModal(true)}
               title="Crear grupo temático"
             >
               <Users size={20} />
               <span>Crear Grupo</span>
             </button>
             <button 
                className="btn-add-collection"
                onClick={async () => {
                  setAddingToCollection(true);
                  try {
                    const userStr = localStorage.getItem('user');
                    const token = localStorage.getItem('token');
                    if (!userStr || !token) return;
                    const user = JSON.parse(userStr);
                    
                    await fetch('/api/groups/collection/add', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ userId: user.id, animeId: anime.id })
                    });
                  } catch (e) {
                    alert('Error al agregar a la colección');
                  } finally {
                    setAddingToCollection(false);
                  }
                }}
                disabled={addingToCollection}
                title="Agregar a mi colección"
              >
                <BookOpen size={20} />
                <span>{addingToCollection ? 'Agregando...' : 'Agregar a Colección'}</span>
              </button>


           </div>
         </div>
       </div>

      {/* TAB BAR */}
      <nav className="tab-navigation" data-tour="anime-tabs">
        <div className="tabs-container">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''} ${tab.id === 'manga' ? 'manga-tab-btn' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              data-tour={`tab-btn-${tab.id}`}
            >
              {tab.label}
              {tab.id === 'manga' && !checkingManga && mangaId && (
                <span className="manga-dot-available" title="Manga disponible" />
              )}
              {activeTab === tab.id && <div className="tab-underline" />}
            </button>
          ))}
        </div>
      </nav>

      <div className="page-grid-layout">
        {/* SIDEBAR METADATA */}
        <aside className="anime-sidebar" data-tour="anime-sidebar">
          <div className="meta-glass-card">
            <div className="meta-group"><span className="m-label">Formato</span><span className="m-value">{translateFormat(anime.type)}</span></div>
            <div className="meta-group"><span className="m-label">Episodios</span><span className="m-value">{anime.episodes || '??'}</span></div>
            <div className="meta-group"><span className="m-label">Duración</span><span className="m-value">{anime.duration} min</span></div>
            <div className="meta-group"><span className="m-label">Estado</span><span className="m-value">{translateStatus(anime.status)}</span></div>
            <div className="meta-group"><span className="m-label">Promedio</span><span className="m-value score">{anime.averageScore}%</span></div>
            <div className="meta-group"><span className="m-label">Popularidad</span><span className="m-value">🔥 {anime.popularity.toLocaleString()}</span></div>
            <div className="meta-group"><span className="m-label">Estudio</span><span className="m-value">{studio}</span></div>
            <div className="meta-group"><span className="m-label">Géneros</span>
              <div className="genre-pill-container">
                {anime.genres.map((g: string) => <span key={g} className="genre-pill">{translateGenre(g)}</span>)}
              </div>
            </div>

            {anime.tags?.length > 0 && (
              <div className="meta-group"><span className="m-label">Etiquetas</span>
                <div className="tag-pill-container">
                  {anime.tags.map((t: any) => (
                    <span key={t.name} className="tag-pill" title={t.description}>
                      {t.name} <span className="tag-rank">{t.rank}%</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="sidebar-divider" />
            
            <div className="meta-group"><span className="m-label">Romaji</span><span className="m-value small">{anime.title.romaji}</span></div>
            <div className="meta-group"><span className="m-label">Native</span><span className="m-value small">{anime.title.native}</span></div>
            
            {anime.externalLinks?.length > 0 && (
              <>
                <div className="sidebar-divider" />
                <div className="meta-group"><span className="m-label">Enlaces</span>
                  <div className="links-grid">
                    {anime.externalLinks.map((link: any) => (
                      <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="ext-link">
                        {link.site}
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="sidebar-divider" />
            <button 
              className="btn-sync-force" 
              disabled={syncing}
              onClick={async () => {
                setSyncing(true);
                try {
                  const realId = params.id.split('-')[0];
                  const data = await getAnimeDetails(realId, true); 
                  setAnime(data);
                  setVisibleChars(50);
                } catch (e) {
                  setError('Error al resincronizar');
                } finally {
                  setSyncing(false);
                }
              }}
            >
              {syncing ? '⌛ Sincronizando elenco completo...' : '🔄 Resincronizar Datos'}
            </button>
          </div>
        </aside>

       {/* CONTENIDO DINÁMICO POR PESTAÑA */}
       <main className="anime-main-content">
         <div>
           {activeTab === 'overview' && (
             <div key="overview" className="tab-pane animate-fadeInUp animate-delay-100" data-tour="anime-overview">
               <section className="info-block">
                 <h3>Sinopsis</h3>
                 <div className="description-text">{stripHtml(anime.description)}</div>
               </section>

               {anime.relations?.length > 0 && (
                 <section className="info-block">
                   <h3>Relaciones</h3>
                   <div className="relations-horizontal">
                     {anime.relations.map((rel: any) => (
                       <Link key={rel.id} href={`/dashboard/anime/${rel.id}`} className="rel-card-modern">
                         <div className="rel-card-img"><Image src={rel.coverImage.large} alt={rel.title.romaji} fill /></div>
                         <div className="rel-card-data">
                           <span className="rel-label">{translateFormat(rel.type)}</span>
                           <p className="rel-title-p">{rel.title.english || rel.title.romaji}</p>
                         </div>
                       </Link>
                     ))}
                   </div>
                 </section>
               )}

               {anime.trailerYoutubeId && (
                 <section className="info-block">
                   <h3>Tráiler Oficial</h3>
                   <div className="trailer-embed-container">
                     <iframe src={`https://www.youtube.com/embed/${anime.trailerYoutubeId}`} frameBorder="0" allowFullScreen />
                   </div>
                 </section>
               )}
               
               {anime.recommendations?.length > 0 && (
                 <section className="info-block">
                   <h3>Recomendaciones</h3>
                   <div className="recommendations-grid-layout">
                     {anime.recommendations.slice(0, 6).map((rec: any) => (
                       <Link key={rec.id} href={`/dashboard/anime/${rec.id}`} className="rec-box">
                         <div className="rec-box-img"><Image src={rec.coverImage.large} alt={rec.title.romaji} fill /></div>
                         <p className="rec-box-title">{rec.title.english || rec.title.romaji}</p>
                       </Link>
                     ))}
                   </div>
                 </section>
               )}
             </div>
           )}

           {activeTab === 'characters' && (
             <div key="characters" className="tab-pane animate-fadeInUp animate-delay-200" data-tour="anime-characters">
                <div className="characters-dual-grid">
                  {anime.characters?.nodes?.slice(0, visibleChars).map((char: any) => (
                    <div key={char.id} className="char-dual-card">
                      <div className="char-side">
                        <div className="char-mini-portrait"><Image src={char.image} alt={char.name} fill /></div>
                        <div className="char-mini-info">
                          <p className="cm-name">{char.name}</p>
                          <p className="cm-role">{char.role === 'MAIN' ? 'Protagonista' : 'Secundario'}</p>
                        </div>
                      </div>
                      {char.voiceActors?.[0] && (
                        <div className="va-side">
                          <div className="va-mini-info">
                            <p className="vm-name">{char.voiceActors[0].name.full}</p>
                            <p className="vm-lang">Japonés</p>
                          </div>
                          <div className="va-mini-portrait"><Image src={char.voiceActors[0].image.large} alt={char.voiceActors[0].name.full} fill /></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="load-more-container">
                  {anime.characters?.nodes?.length > visibleChars ? (
                    <button className="btn-load-more" onClick={() => setVisibleChars(prev => prev + 50)}>
                      Ver más personajes (+50)
                    </button>
                  ) : (
                    <p className="no-more-label">Has llegado al final del reparto registrado.</p>
                  )}
                 <p className="char-count-info">Mostrando {Math.min(visibleChars, anime.characters?.nodes?.length || 0)} de {anime.characters?.nodes?.length || 0} personajes</p>
               </div>
             </div>
           )}

           {activeTab === 'staff' && (
             <div key="staff" className="tab-pane animate-fadeInUp animate-delay-300" data-tour="anime-staff">
               <div className="staff-full-grid">
                 {anime.staff?.map((s: any) => (
                   <div key={s.id} className="staff-entry">
                     <div className="staff-portrait"><Image src={s.image.large} alt={s.name.full} fill /></div>
                     <div className="staff-entry-info">
                       <p className="se-name">{s.name.full}</p>
                       <p className="se-job">{s.primaryOccupations?.[0] || 'Producción'}</p>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}

           {activeTab === 'social' && (
             <div key="social" className="tab-pane animate-fadeInUp animate-delay-400" data-tour="anime-social">
               <AnimeSocialFeed animeId={Number(anime.id)} animeTitle={title} />
             </div>
           )}

           {activeTab === 'manga' && (
             <div key="manga" className="tab-pane animate-fadeInUp animate-delay-400">
               {checkingManga ? (
                 <div className="manga-tab-loading">
                   <div className="manga-spinner" />
                   <p>Buscando manga en MangaDex...</p>
                 </div>
               ) : mangaId ? (
                 <div className="manga-tab-available">
                   <div className="manga-tab-header">
                     <h3>📖 Manga disponible en MangaDex</h3>
                     <p>Este anime tiene un manga adaptación disponible para leer.</p>
                   </div>
                   <Link href={`/dashboard/manga/${mangaId}`} className="manga-tab-cta">
                     <span className="manga-tab-cta-icon">📚</span>
                     <span className="manga-tab-cta-text">
                       <strong className="manga-tab-cta-title">Ver capítulos del manga</strong>
                       <small className="manga-tab-cta-sub">Lista completa de capítulos en MangaDex</small>
                     </span>
                     <span className="manga-tab-cta-arrow">→</span>
                   </Link>
                 </div>
               ) : (
              <div className="manga-tab-unavailable">
                   <span className="manga-unavail-icon">📭</span>
                   <h3>Manga no disponible</h3>
                   <p>No encontramos un manga correspondiente a este anime en MangaDex.</p>
                 </div>
               )}
             </div>
           )}

           {activeTab === 'stats' && (
              <div key="stats" className="tab-pane animate-fadeInUp animate-delay-500" data-tour="anime-stats">
                <div className="stats-container">
                  
                  {/* COMPARISON SEARCH BOX */}
                  <section className="stat-card search-compare-section">
                    <h4>Nexo de Comparación Dimensional</h4>
                    <p className="compare-subtitle">Busca cualquier anime de la base de datos para comparar sus estadísticas cara a cara.</p>
                    
                    <div className="compare-search-wrapper">
                      <input 
                        type="text" 
                        placeholder="Escribe el nombre del anime a comparar..." 
                        value={compareSearchQuery}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setCompareSearchQuery(val);
                          if (val.length < 2) {
                            setCompareResults([]);
                            return;
                          }
                          setIsSearchingCompare(true);
                          try {
                            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/search/global?q=${encodeURIComponent(val)}`);
                            const data = await res.json();
                            if (data.success) {
                              setCompareResults(data.data.animes || []);
                            }
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setIsSearchingCompare(false);
                          }
                        }}
                        className="compare-input"
                      />
                      {isSearchingCompare && <div className="compare-spinner-mini" />}
                    </div>

                    {compareResults.length > 0 && (
                      <div className="compare-dropdown-results">
                        {compareResults.map((a: any) => (
                          <div 
                            key={a.id} 
                            className="compare-dropdown-item"
                            onClick={async () => {
                              try {
                                const details = await getAnimeDetails(a.id);
                                setComparingAnime(details);
                                setCompareResults([]);
                                setCompareSearchQuery('');
                              } catch (err) {
                                alert('Error al cargar datos de comparación');
                              }
                            }}
                          >
                            <img src={a.coverImage} alt={a.title} className="comp-drop-img" />
                            <div className="comp-drop-info">
                              <p className="comp-drop-title">{a.title}</p>
                              <p className="comp-drop-meta">{translateFormat(a.format)} • ⭐ {a.meanScore}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* COMPARISON BODY PANEL */}
                  {comparingAnime ? (
                    <div className="comparison-workspace animate-fadeInUp">
                      
                      {/* HEAD TO HEAD HEADER */}
                      <div className="h2h-header">
                        <div className="h2h-party current-party">
                          <img src={anime.coverImage.large} alt={title} className="h2h-img" />
                          <h5>{title}</h5>
                        </div>
                        <div className="h2h-vs">VS</div>
                        <div className="h2h-party target-party">
                          <img src={comparingAnime.coverImage?.extraLarge || comparingAnime.coverImage?.large} alt={comparingAnime.title.english || comparingAnime.title.romaji} className="h2h-img" />
                          <h5>{comparingAnime.title.english || comparingAnime.title.romaji}</h5>
                          <button className="btn-clear-compare" onClick={() => setComparingAnime(null)}>Quitar</button>
                        </div>
                      </div>

                      {/* STATS METRIC GRID */}
                      <div className="comparison-metrics-grid">
                        
                        {/* SCORE CARD */}
                        <div className="metric-compare-card">
                          <span className="m-title">Puntuación Media</span>
                          <div className="m-cols-wrapper">
                            <div className="m-col left-align">
                              <span className="m-col-label">Este Anime</span>
                              <span className={`m-val ${anime.averageScore >= (comparingAnime.averageScore || 0) ? 'winner-cyan' : ''}`}>
                                {anime.averageScore}%
                              </span>
                            </div>
                            <div className="m-col-divider" />
                            <div className="m-col right-align">
                              <span className="m-col-label">Comparado</span>
                              <span className={`m-val ${comparingAnime.averageScore >= anime.averageScore ? 'winner-cyan' : ''}`}>
                                {comparingAnime.averageScore || '—'}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* POPULARITY CARD */}
                        <div className="metric-compare-card">
                          <span className="m-title">Popularidad (Listas)</span>
                          <div className="m-cols-wrapper">
                            <div className="m-col left-align">
                              <span className="m-col-label">Este Anime</span>
                              <span className={`m-val ${anime.popularity >= (comparingAnime.popularity || 0) ? 'winner-cyan' : ''}`}>
                                🔥 {anime.popularity.toLocaleString()}
                              </span>
                            </div>
                            <div className="m-col-divider" />
                            <div className="m-col right-align">
                              <span className="m-col-label">Comparado</span>
                              <span className={`m-val ${comparingAnime.popularity >= anime.popularity ? 'winner-cyan' : ''}`}>
                                🔥 {(comparingAnime.popularity || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* EPISODES CARD */}
                        <div className="metric-compare-card">
                          <span className="m-title">Episodios Totales</span>
                          <div className="m-cols-wrapper">
                            <div className="m-col left-align">
                              <span className="m-col-label">Este Anime</span>
                              <span className="m-val">{anime.episodes || '—'}</span>
                            </div>
                            <div className="m-col-divider" />
                            <div className="m-col right-align">
                              <span className="m-col-label">Comparado</span>
                              <span className="m-val">{comparingAnime.episodes || '—'}</span>
                            </div>
                          </div>
                        </div>

                        {/* DURATION CARD */}
                        <div className="metric-compare-card">
                          <span className="m-title">Duración promedio</span>
                          <div className="m-cols-wrapper">
                            <div className="m-col left-align">
                              <span className="m-col-label">Este Anime</span>
                              <span className="m-val">{anime.duration ? `${anime.duration} min` : '—'}</span>
                            </div>
                            <div className="m-col-divider" />
                            <div className="m-col right-align">
                              <span className="m-col-label">Comparado</span>
                              <span className="m-val">{comparingAnime.duration ? `${comparingAnime.duration} min` : '—'}</span>
                            </div>
                          </div>
                        </div>

                        {/* STATE CARD */}
                        <div className="metric-compare-card">
                          <span className="m-title">Estado actual</span>
                          <div className="m-cols-wrapper">
                            <div className="m-col left-align">
                              <span className="m-col-label">Este Anime</span>
                              <span className="m-val-text">{translateStatus(anime.status)}</span>
                            </div>
                            <div className="m-col-divider" />
                            <div className="m-col right-align">
                              <span className="m-col-label">Comparado</span>
                              <span className="m-val-text">{translateStatus(comparingAnime.status)}</span>
                            </div>
                          </div>
                        </div>

                        {/* SOURCE CARD */}
                        <div className="metric-compare-card">
                          <span className="m-title">Origen</span>
                          <div className="m-cols-wrapper">
                            <div className="m-col left-align">
                              <span className="m-col-label">Este Anime</span>
                              <span className="m-val-text">{anime.source || 'Original'}</span>
                            </div>
                            <div className="m-col-divider" />
                            <div className="m-col right-align">
                              <span className="m-col-label">Comparado</span>
                              <span className="m-val-text">{comparingAnime.source || 'Original'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* DOUBLE SCORE DISTRIBUTION CHART */}
                      <section className="stat-card dual-distribution-chart">
                        <h4>Distribución de Puntuaciones Comparada</h4>
                        <div className="dual-distribution-bars">
                          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(scoreIndex => {
                            const currentAmount = anime.stats?.scoreDistribution?.find((x: any) => x.score === scoreIndex)?.amount || 0;
                            const targetAmount = comparingAnime.stats?.scoreDistribution?.find((x: any) => x.score === scoreIndex)?.amount || 0;
                            const maxVal = Math.max(
                              ...(anime.stats?.scoreDistribution?.map((x: any) => x.amount) || [1]),
                              ...(comparingAnime.stats?.scoreDistribution?.map((x: any) => x.amount) || [1])
                            );

                            return (
                              <div key={scoreIndex} className="dual-score-row">
                                <span className="dual-score-label">{scoreIndex}0%</span>
                                <div className="dual-bars-wrapper">
                                  {/* Current Anime (Cian) */}
                                  <div className="dual-bar-bg-half">
                                    <div 
                                      className="dual-bar-fill current-color" 
                                      style={{ width: `${(currentAmount / maxVal) * 100}%` }} 
                                      title={`${title}: ${currentAmount}`}
                                    />
                                  </div>
                                  {/* Target Anime (Púrpura) */}
                                  <div className="dual-bar-bg-half">
                                    <div 
                                      className="dual-bar-fill target-color" 
                                      style={{ width: `${(targetAmount / maxVal) * 100}%` }} 
                                      title={`${comparingAnime.title.english || comparingAnime.title.romaji}: ${targetAmount}`}
                                    />
                                  </div>
                                </div>
                                <div className="dual-counts">
                                  <span className="count-c">{currentAmount}</span>
                                  <span className="count-t">{targetAmount}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>

                    </div>
                  ) : (
                    /* FALLBACK: SINGLE DISTRIBUTION IF NO COMPARISON ACTIVE */
                    <section className="stat-card animate-fadeInUp">
                      <h4>Distribución de Puntuación</h4>
                      <div className="score-bars">
                        {anime.stats?.scoreDistribution?.map((s: any) => (
                          <div key={s.score} className="score-row">
                            <span className="score-label">{s.score}0%</span>
                            <div className="score-bar-bg">
                              <div className="score-bar-fill" style={{ width: `${(s.amount / Math.max(...anime.stats.scoreDistribution.map((x:any)=>x.amount))) * 100}%`, transition: 'width 0.3s ease' }}></div>
                            </div>
                            <span className="score-count">{s.amount}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </div>
           )}
           </div>
        </main>
            </div>


      {/* Modal para crear grupo */}
      {showGroupModal && (
        <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Crear Grupo Temático</h3>
            <input 
              type="text" 
              placeholder="Nombre del grupo" 
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="modal-input"
            />
            <div className="modal-actions">
              <button onClick={() => setShowGroupModal(false)} className="btn-modal-cancel">Cancelar</button>
              <button 
                onClick={async () => {
                  if (!groupName.trim()) return;
                  const userStr = localStorage.getItem('user');
                  const token = localStorage.getItem('token');
                  if (!userStr || !token) return;
                  const user = JSON.parse(userStr);
                  
                  await fetch('/api/groups/create', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                      userId: user.id, 
                      animeId: anime.id, 
                      name: groupName 
                    })
                  });
                  setShowGroupModal(false);
                  setGroupName('');
                }}
                className="btn-modal-create"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

         <style jsx>{`
         .anime-page { background: #050505; color: #fff; min-height: 100vh; font-family: 'Inter', sans-serif; }
         
         /* HERO */
         .banner-section { position: relative; height: 400px; margin-bottom: 0; }
         .banner-wrapper { position: absolute; inset: 0; }
         .banner-img { object-fit: cover; opacity: 0.4; }
         .banner-placeholder { width: 100%; height: 100%; background: #111; }
         .banner-overlay { position: absolute; inset: 0; background: linear-gradient(to top, #050505, transparent); }
         .header-content-box { position: absolute; bottom: 40px; left: 5%; right: 5%; display: flex; gap: 40px; align-items: flex-end; z-index: 10; }
         .poster-main { width: 220px; height: 320px; position: relative; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.1); }
         .poster-img { object-fit: cover; }
         .header-text-main { flex: 1; padding-bottom: 20px; }
         .anime-title-h1 { font-size: 3rem; font-weight: 950; margin: 0 0 15px 0; line-height: 1.1; }
         .quick-tags { display: flex; gap: 10px; }
         .q-tag { padding: 6px 15px; background: rgba(255,255,255,0.1); border-radius: 30px; font-size: 0.85rem; font-weight: 700; }
         .q-tag.score { color: #00E5FF; background: rgba(0, 229, 255, 0.1); }
 
         /* TABS */
         .tab-navigation { background: #0a0a0a; border-bottom: 1px solid #1a1a1a; position: sticky; top: 0; z-index: 100; padding: 0 5%; }
         .tabs-container { display: flex; gap: 30px; }
         .tab-btn { position: relative; padding: 20px 0; background: none; border: none; color: #666; font-weight: 800; cursor: pointer; transition: 0.3s; font-size: 0.9rem; display: flex; align-items: center; gap: 6px; }
         .tab-btn:hover { color: #fff; }
         .tab-btn.active { color: #00E5FF; }
         .tab-underline { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: #00E5FF; border-radius: 3px 3px 0 0; }
         .manga-tab-btn { white-space: nowrap; }
         .manga-dot-available { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 6px rgba(74, 222, 128, 0.7); flex-shrink: 0; }
 
         /* GRID LAYOUT */
         .page-grid-layout { display: grid; grid-template-columns: 280px 1fr; gap: 50px; padding: 40px 5%; }
 
         /* SIDEBAR */
         .meta-glass-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 25px; display: flex; flex-direction: column; gap: 20px; position: sticky; top: 100px; }
         .meta-group { display: flex; flex-direction: column; gap: 4px; }
         .m-label { font-size: 0.75rem; font-weight: 900; color: #444; text-transform: uppercase; letter-spacing: 1.5px; }
         .m-value { font-size: 0.95rem; font-weight: 700; color: #ddd; }
         .m-value.score { color: #00E5FF; }
         .m-value.small { font-size: 0.75rem; color: #666; }
         .genre-pill-container { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px; }
         .genre-pill { padding: 4px 12px; background: rgba(255,255,255,0.05); border-radius: 6px; font-size: 0.7rem; font-weight: 800; border: 1px solid rgba(255,255,255,0.08); }
         .tag-pill-container { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 5px; }
         .tag-pill { padding: 4px 10px; background: rgba(255,255,255,0.03); border-radius: 4px; font-size: 0.65rem; color: #888; border: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; width: 100%; }
         .tag-rank { color: #00E5FF; opacity: 0.6; }
         .sidebar-divider { height: 1px; background: rgba(255,255,255,0.05); }
         .links-grid { display: flex; flex-wrap: wrap; gap: 10px; }
         .ext-link { font-size: 0.8rem; color: #00E5FF; text-decoration: none; padding: 5px 10px; background: rgba(0, 229, 255, 0.05); border-radius: 6px; }
         .btn-sync-force { margin-top: 10px; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #888; border-radius: 12px; font-weight: 800; cursor: pointer; font-size: 0.8rem; transition: 0.3s; width: 100%; }
         .btn-sync-force:hover { background: #00E5FF; color: #000; border-color: #00E5FF; transform: scale(1.02); }
 
         /* MAIN CONTENT */
         .info-block { margin-bottom: 60px; }
         .info-block h3 { font-size: 1.3rem; font-weight: 900; margin-bottom: 25px; border-left: 4px solid #00E5FF; padding-left: 15px; }
         .description-text { color: #aaa; line-height: 1.8; font-size: 1.05rem; }
         .description-text :global(br) { margin-bottom: 15px; display: block; content: ""; }
 
         .relations-horizontal { display: flex; gap: 20px; overflow-x: auto; padding-bottom: 20px; scrollbar-width: none; }
         .rel-card-modern { width: 220px; flex-shrink: 0; background: #111; border-radius: 12px; overflow: hidden; border: 1px solid #222; text-decoration: none; transition: 0.3s; }
         .rel-card-modern:hover { transform: translateY(-5px); border-color: #00E5FF; }
         .rel-card-img { height: 140px; position: relative; }
         .rel-card-img :global(img) { object-fit: cover; }
         .rel-card-data { padding: 12px; }
         .rel-label { font-size: 0.65rem; font-weight: 900; color: #00E5FF; text-transform: uppercase; }
         .rel-title-p { font-size: 0.85rem; font-weight: 700; color: #fff; margin: 4px 0 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
 
         .trailer-embed-container { aspect-ratio: 16/9; width: 100%; max-width: 640px; border-radius: 16px; overflow: hidden; border: 1px solid rgba(0, 229, 255, 0.2); box-shadow: 0 0 30px rgba(0, 229, 255, 0.08); }
         .trailer-embed-container iframe { width: 100%; height: 100%; display: block; }
 
         .recommendations-grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; }
         .rec-box { text-decoration: none; transition: 0.3s; }
         .rec-box:hover { transform: scale(1.03); }
         .rec-box-img { aspect-ratio: 2/3; position: relative; border-radius: 10px; overflow: hidden; margin-bottom: 10px; }
         .rec-box-title { font-size: 0.85rem; font-weight: 700; color: #fff; text-align: center; }

         /* COMPARE MODE PREMIUM STYLES */
         .search-compare-section { margin-bottom: 30px; position: relative; }
         .compare-subtitle { font-size: 0.85rem; color: #666; margin-bottom: 20px; }
         .compare-search-wrapper { position: relative; display: flex; align-items: center; }
         .compare-input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px 20px; color: #fff; font-size: 0.95rem; outline: none; transition: border-color 0.2s; }
         .compare-input:focus { border-color: #00E5FF; }
         .compare-spinner-mini { position: absolute; right: 18px; width: 16px; height: 16px; border: 2px solid rgba(0, 229, 255, 0.2); border-top-color: #00E5FF; border-radius: 50%; animation: spin 0.8s linear infinite; }
         .compare-dropdown-results { position: absolute; left: 0; right: 0; background: rgba(10,10,12,0.98); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; margin-top: 8px; max-height: 250px; overflow-y: auto; z-index: 10; box-shadow: 0 10px 30px rgba(0,0,0,0.8); }
         .compare-dropdown-item { display: flex; align-items: center; gap: 12px; padding: 12px 18px; cursor: pointer; transition: background 0.2s; }
         .compare-dropdown-item:hover { background: rgba(0,229,255,0.08); }
         .comp-drop-img { width: 36px; height: 50px; object-fit: cover; border-radius: 4px; }
         .comp-drop-info { display: flex; flex-direction: column; gap: 2px; }
         .comp-drop-title { font-size: 0.85rem; font-weight: 700; color: #fff; margin: 0; }
         .comp-drop-meta { font-size: 0.75rem; color: #666; margin: 0; }

         .comparison-workspace { display: flex; flex-direction: column; gap: 35px; }
         .h2h-header { display: flex; align-items: center; justify-content: space-around; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 25px; gap: 20px; }
         .h2h-party { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; flex: 1; max-width: 250px; }
         .h2h-img { width: 100px; height: 140px; object-fit: cover; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
         .h2h-party h5 { font-size: 1rem; font-weight: 800; margin: 0; color: #fff; line-height: 1.3; }
         .h2h-vs { font-size: 1.8rem; font-weight: 950; color: #00E5FF; text-shadow: 0 0 15px rgba(0, 229, 255, 0.4); font-style: italic; }
         .btn-clear-compare { margin-top: 6px; padding: 4px 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; border-radius: 20px; font-size: 0.72rem; font-weight: 800; cursor: pointer; transition: 0.2s; }
         .btn-clear-compare:hover { background: #ef4444; color: #fff; }

         .comparison-metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
         .metric-compare-card { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
         .metric-compare-card .m-title { font-size: 0.72rem; font-weight: 800; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
         .m-cols-wrapper { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
         .m-col { display: flex; flex-direction: column; gap: 2px; flex: 1; }
         .m-col.left-align { align-items: flex-start; text-align: left; }
         .m-col.right-align { align-items: flex-end; text-align: right; }
         .m-col-label { font-size: 0.65rem; color: #444; font-weight: 700; text-transform: uppercase; }
         .m-col-divider { width: 1px; height: 35px; background: rgba(255,255,255,0.08); }
         .metric-compare-card .m-val { font-size: 1.25rem; font-weight: 900; color: #ddd; }
         .metric-compare-card .m-val.winner-cyan { color: #00E5FF; text-shadow: 0 0 10px rgba(0, 229, 255, 0.25); }
         .metric-compare-card .m-val-text { font-size: 0.95rem; font-weight: 700; color: #bbb; }

         /* DUAL SCORES CHART */
         .dual-distribution-chart { padding: 30px; }
         .dual-distribution-bars { display: flex; flex-direction: column; gap: 14px; }
         .dual-score-row { display: flex; align-items: center; gap: 15px; }
         .dual-score-label { width: 45px; font-size: 0.8rem; font-weight: 800; color: #555; }
         .dual-bars-wrapper { flex: 1; display: flex; gap: 8px; height: 12px; }
         .dual-bar-bg-half { flex: 1; height: 100%; background: #131317; border-radius: 6px; overflow: hidden; position: relative; }
         .dual-bar-fill { height: 100%; border-radius: 6px; transition: width 0.8s ease; }
         .dual-bar-fill.current-color { background: #00E5FF; box-shadow: 0 0 8px rgba(0, 229, 255, 0.3); }
         .dual-bar-fill.target-color { background: #a855f7; box-shadow: 0 0 8px rgba(168, 85, 247, 0.3); }
         .dual-counts { width: 100px; display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 800; }
         .count-c { color: #00E5FF; }
         .count-t { color: #a855f7; }
 
         /* CHARACTERS DUAL TAB */
         .characters-dual-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 15px; }
         .char-dual-card { display: flex; justify-content: space-between; background: #111; border: 1px solid #222; border-radius: 8px; overflow: hidden; height: 80px; }
         .char-side, .va-side { display: flex; gap: 12px; align-items: center; width: 48%; }
         .char-side { padding-left: 0; }
         .va-side { flex-direction: row; justify-content: flex-end; padding-right: 0; text-align: right; }
         
         .char-mini-portrait, .va-mini-portrait { width: 60px; height: 80px; position: relative; flex-shrink: 0; }
         .char-mini-portrait :global(img), .va-mini-portrait :global(img) { object-fit: cover; }
         
         .char-mini-info, .va-mini-info { display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
         .cm-name, .vm-name { font-size: 0.85rem; font-weight: 800; color: #fff; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
         .cm-role, .vm-lang { font-size: 0.7rem; color: #666; font-weight: 700; margin: 2px 0 0 0; }
         .vm-lang { color: #00E5FF; opacity: 0.7; }
 
         .load-more-container { margin-top: 40px; display: flex; flex-direction: column; align-items: center; gap: 15px; }
         .btn-load-more { padding: 15px 40px; background: #00E5FF; color: #000; border: none; border-radius: 12px; font-weight: 900; cursor: pointer; font-size: 1rem; transition: 0.3s; }
         .btn-load-more:hover { transform: scale(1.05); box-shadow: 0 0 30px rgba(0, 229, 255, 0.3); }
         .char-count-info { font-size: 0.85rem; color: #555; font-weight: 700; }
 
         /* STAFF TAB */
         .staff-full-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
         .staff-entry { display: flex; gap: 15px; background: #111; padding: 10px; border-radius: 12px; border: 1px solid #222; align-items: center; }
         .staff-portrait { width: 70px; height: 70px; position: relative; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
         .staff-portrait :global(img) { object-fit: cover; }
         .se-name { font-size: 1rem; font-weight: 800; margin: 0; color: #fff; }
         .se-job { font-size: 0.75rem; color: #00E5FF; font-weight: 700; margin: 2px 0 0 0; }
 
         /* STATS TAB */
         .stats-container { display: flex; flex-direction: column; gap: 30px; }
         .stat-card { background: #111; border: 1px solid #222; border-radius: 20px; padding: 30px; }
         .stat-card h4 { margin: 0 0 25px 0; font-size: 1.2rem; font-weight: 900; color: #00E5FF; }
         .score-bars { display: flex; flex-direction: column; gap: 12px; }
         .score-row { display: flex; align-items: center; gap: 15px; }
         .score-label { width: 50px; font-size: 0.8rem; font-weight: 800; color: #666; }
         .score-bar-bg { flex: 1; height: 10px; background: #1a1a1a; border-radius: 10px; overflow: hidden; }
         .score-bar-fill { height: 100%; background: #00E5FF; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 229, 255, 0.4); }
          .score-count { width: 60px; font-size: 0.8rem; font-weight: 800; color: #ddd; text-align: right; }
 
          /* Anime Actions (Groups & Collection Buttons) */
          .anime-actions {
            display: flex;
            gap: 15px;
            margin-left: auto;
            margin-top: 40px;
          }
 
          .btn-create-group, .btn-add-collection {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            border-radius: 12px;
            border: none;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 0.9rem;
          }
 
          .btn-create-group {
            background: rgba(255, 255, 255, 0.05);
            color: #00E5FF;
            border: 1px solid rgba(0, 229, 255, 0.2);
          }
 
          .btn-create-group:hover {
            background: rgba(0, 229, 255, 0.1);
            transform: translateY(-2px);
            box-shadow: 0 0 20px rgba(0, 229, 255, 0.2);
          }
 
          .btn-add-collection {
            background: rgba(69, 189, 98, 0.1);
            color: #45bd62;
            border: 1px solid rgba(69, 189, 98, 0.2);
          }
 
          .btn-add-collection:hover:not(:disabled) {
            background: rgba(69, 189, 98, 0.2);
            transform: translateY(-2px);
            box-shadow: 0 0 20px rgba(69, 189, 98, 0.2);
          }

          /* Manga Tab Panel */
          .manga-tab-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 20px;
            gap: 16px;
            color: #aaa;
          }
          .manga-spinner {
            width: 44px;
            height: 44px;
            border: 3px solid rgba(0, 229, 255, 0.15);
            border-top: 3px solid #00E5FF;
            border-radius: 50%;
            animation: spin 0.9s linear infinite;
          }
          .manga-tab-available {
            display: flex;
            flex-direction: column;
            gap: 24px;
            padding: 32px 0;
          }
          .manga-tab-header h3 {
            font-size: 1.4rem;
            font-weight: 800;
            color: #fff;
            margin: 0 0 8px;
          }
          .manga-tab-header p {
            color: #aaa;
            margin: 0;
            font-size: 0.95rem;
          }
          .manga-tab-cta {
            display: flex;
            align-items: center;
            gap: 18px;
            padding: 24px 28px;
            background: rgba(0, 229, 255, 0.06);
            border: 1px solid rgba(0, 229, 255, 0.25);
            border-radius: 16px;
            text-decoration: none;
            transition: all 0.3s;
            cursor: pointer;
            max-width: 500px;
          }
          .manga-tab-cta:hover {
            background: rgba(0, 229, 255, 0.12);
            border-color: rgba(0, 229, 255, 0.5);
            transform: translateX(4px);
            box-shadow: 0 0 30px rgba(0, 229, 255, 0.1);
          }
          .manga-tab-cta-icon {
            font-size: 2.5rem;
            flex-shrink: 0;
          }
          .manga-tab-cta-text {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .manga-tab-cta-title {
            font-size: 1.1rem;
            font-weight: 800;
            color: #00E5FF;
            display: block;
          }
          .manga-tab-cta-sub {
            font-size: 0.85rem;
            color: #888;
            display: block;
          }
          .manga-tab-cta-arrow {
            font-size: 1.5rem;
            color: #00E5FF;
            flex-shrink: 0;
          }
          .manga-tab-unavailable {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 20px;
            gap: 16px;
            text-align: center;
          }
          .manga-unavail-icon { font-size: 3rem; }
          .manga-tab-unavailable h3 {
            font-size: 1.3rem;
            font-weight: 800;
            color: #ff4a4a;
            margin: 0;
          }
          .manga-tab-unavailable p {
            color: #666;
            margin: 0;
            font-size: 0.9rem;
            max-width: 380px;
          }
 
          /* Modal */
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            backdrop-filter: blur(5px);
          }
 
          .modal-content {
            background: #111;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 16px;
            padding: 30px;
            min-width: 350px;
            max-width: 90%;
          }
 
          .modal-content h3 {
            margin: 0 0 20px 0;
            color: #00E5FF;
            font-weight: 900;
          }
 
          .modal-input {
            width: 100%;
            padding: 15px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 10px;
            color: white;
            font-size: 1rem;
            margin-bottom: 20px;
          }
 
          .modal-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
          }
 
          .btn-modal-cancel, .btn-modal-create {
            padding: 10px 20px;
            border-radius: 8px;
            border: none;
            font-weight: 800;
            cursor: pointer;
          }
 
          .btn-modal-cancel {
            background: transparent;
            color: #888;
            border: 1px solid rgba(255,255,255,0.1);
          }
 
          .btn-modal-create {
            background: #00E5FF;
            color: #000;
          }
          
          /* Entrance animations for tabs */
          .tab-pane {
            opacity: 0;
            transform: translateY(20px);
            animation: fadeInUp 0.8s ease-out forwards;
          }
          .animate-delay-100 { animation-delay: 0.1s; }
          .animate-delay-200 { animation-delay: 0.2s; }
          .animate-delay-300 { animation-delay: 0.3s; }
          .animate-delay-400 { animation-delay: 0.4s; }
          .animate-delay-500 { animation-delay: 0.5s; }
          
          @keyframes fadeInUp {
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
    </div>
  );
}

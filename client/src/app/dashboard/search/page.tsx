'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AnimeCard } from '../../../components/discovery/AnimeCard';
import { MangaCard } from '../../../components/discovery/MangaCard';
import Link from 'next/link';
import { Compass, X, Sparkles, ChevronDown } from 'lucide-react';
import { translateGenre, translateStatus, translateFormat, translateSeason } from '../../../lib/translations';

const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", "Horror", 
  "Mahou Shoujo", "Mecha", "Music", "Mystery", "Psychological", "Romance", 
  "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller"
];

const YEARS = Array.from({ length: 55 }, (_, i) => 2025 - i);
const STATUS = ["FINISHED", "RELEASING", "NOT_YET_RELEASED", "CANCELLED", "HIATUS"];
const FORMATS = ["TV", "TV_SHORT", "MOVIE", "SPECIAL", "OVA", "ONA", "MUSIC"];
const SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"];

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [animes, setAnimes] = useState<any[]>([]);
  const [mangas, setMangas] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchMode, setSearchMode] = useState<'anime' | 'manga'>('anime');
  const [showFilters, setShowFilters] = useState(false);

  // Estados para custom dropdowns
  const [dropdownActive, setDropdownActive] = useState<'year' | 'season' | 'status' | 'format' | null>(null);
  
  const observer = useRef<IntersectionObserver | null>(null);

  // Estados temporales del cajón de filtros
  const [tempQuery, setTempQuery] = useState(searchParams.get('query') || '');
  const [tempSelectedGenres, setTempSelectedGenres] = useState<string[]>(searchParams.get('genres')?.split(',').filter(Boolean) || []);
  const [tempYear, setTempYear] = useState(searchParams.get('year') || '');
  const [tempSeason, setTempSeason] = useState(searchParams.get('season') || '');
  const [tempStatus, setTempStatus] = useState(searchParams.get('status') || '');
  const [tempFormat, setTempFormat] = useState(searchParams.get('format') || '');

  // Estados reales aplicados a la búsqueda
  const [appliedQuery, setAppliedQuery] = useState(searchParams.get('query') || '');
  const [appliedGenres, setAppliedGenres] = useState<string[]>(searchParams.get('genres')?.split(',').filter(Boolean) || []);
  const [appliedYear, setAppliedYear] = useState(searchParams.get('year') || '');
  const [appliedSeason, setAppliedSeason] = useState(searchParams.get('season') || '');
  const [appliedStatus, setAppliedStatus] = useState(searchParams.get('status') || '');
  const [appliedFormat, setAppliedFormat] = useState(searchParams.get('format') || '');

  // Referencias para cerrar dropdowns haciendo clic fuera
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownActive(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const lastAnimeElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const fetchResults = async (pageNum: number, isNewSearch: boolean = false) => {
    if (loading && !isNewSearch) return;
    setLoading(true);
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

    try {
      if (pageNum === 1 && appliedQuery) {
        try {
          const resUser = await fetch(`${apiUrl}/search/global?q=${encodeURIComponent(appliedQuery)}`);
          const globalData = await resUser.json();
          if (globalData.success) {
            setUsers(globalData.data.users || []);
            if (searchMode === 'manga') {
              setMangas(globalData.data.mangas || []);
            }
          }
        } catch (err) { console.error(err); }
      } else if (!appliedQuery) {
        setUsers([]);
      }

      if (searchMode === 'anime') {
        const params = new URLSearchParams();
        if (appliedQuery) params.append('query', appliedQuery);
        if (appliedGenres.length > 0) params.append('genres', appliedGenres.join(','));
        if (appliedYear) params.append('year', appliedYear);
        if (appliedSeason) params.append('season', appliedSeason);
        if (appliedStatus) params.append('status', appliedStatus);
        if (appliedFormat) params.append('format', appliedFormat);
        params.append('page', pageNum.toString());
        params.append('perPage', '50');

        const res = await fetch(`${apiUrl}/anime/discovery/search?${params.toString()}`);
        const json = await res.json();

        if (json.success) {
          const newData = json.data || [];
          if (newData.length < 50) setHasMore(false);
          else setHasMore(true);

          setAnimes(prev => {
            if (isNewSearch) return newData;
            const existingIds = new Set(prev.map(a => a.id));
            const filtered = newData.filter((a: any) => !existingIds.has(a.id));
            return [...prev, ...filtered];
          });
        } else { setHasMore(false); }
      } else {
        if (appliedQuery) {
          const offset = (pageNum - 1) * 20;
          const res = await fetch(`${apiUrl}/manga/search?q=${encodeURIComponent(appliedQuery)}&limit=20&offset=${offset}`);
          const json = await res.json();
          
          if (json.success) {
            const newData = json.data || [];
            if (newData.length < 20) setHasMore(false);
            else setHasMore(true);

            setMangas(prev => {
              if (isNewSearch) return newData;
              const existingIds = new Set(prev.map(m => m.id));
              const filtered = newData.filter((m: any) => !existingIds.has(m.id));
              return [...prev, ...filtered];
            });
          } else { setHasMore(false); }
        } else {
          setMangas([]);
          setHasMore(false);
        }
      }
    } catch (e) {
      console.error(e);
      setHasMore(false);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    setAnimes([]);
    setMangas([]);
    setPage(1);
    setHasMore(true);
    fetchResults(1, true);
  }, [appliedQuery, searchMode]);

  useEffect(() => {
    setAnimes([]);
    setMangas([]);
    setPage(1);
    setHasMore(true);
    fetchResults(1, true);
    
    const params = new URLSearchParams();
    if (appliedQuery) params.append('query', appliedQuery);
    if (appliedGenres.length > 0) params.append('genres', appliedGenres.join(','));
    if (appliedYear) params.append('year', appliedYear);
    if (appliedSeason) params.append('season', appliedSeason);
    if (appliedStatus) params.append('status', appliedStatus);
    if (appliedFormat) params.append('format', appliedFormat);
    router.replace(`/dashboard/search?${params.toString()}`, { scroll: false });
  }, [appliedGenres, appliedYear, appliedSeason, appliedStatus, appliedFormat]);

  useEffect(() => {
    if (page > 1) fetchResults(page);
  }, [page]);

  const toggleGenre = (genre: string) => {
    setTempSelectedGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]);
  };

  const handleApplyFilters = () => {
    setAppliedQuery(tempQuery);
    setAppliedGenres(tempSelectedGenres);
    setAppliedYear(tempYear);
    setAppliedSeason(tempSeason);
    setAppliedStatus(tempStatus);
    setAppliedFormat(tempFormat);
    setShowFilters(false);
  };

  const activeFiltersCount = appliedGenres.length + (appliedYear ? 1 : 0) + (appliedSeason ? 1 : 0) + (appliedStatus ? 1 : 0) + (appliedFormat ? 1 : 0);

  return (
    <div className="search-page">
      {/* Floating Toggle Button for Drawer */}
      <div className="explore-trigger-bar">
        <button 
          className={`explore-toggle-btn ${showFilters ? 'active' : ''}`}
          onClick={() => {
            if (!showFilters) {
              setTempQuery(appliedQuery);
              setTempSelectedGenres(appliedGenres);
              setTempYear(appliedYear);
              setTempSeason(appliedSeason);
              setTempStatus(appliedStatus);
              setTempFormat(appliedFormat);
            }
            setShowFilters(!showFilters);
          }}
        >
          <Compass className="icon-explore" size={18} />
          <span>Explorar Multiverso</span>
          {activeFiltersCount > 0 && <span className="filter-count-badge">{activeFiltersCount}</span>}
          <ChevronDown className={`arrow-icon ${showFilters ? 'rotated' : ''}`} size={18} />
        </button>
      </div>

      {/* Dropdown Filters Drawer Container */}
      <div className={`filters-drawer-overlay ${showFilters ? 'show' : ''}`} onClick={() => setShowFilters(false)} />
      
      <div className={`filters-drawer ${showFilters ? 'open' : ''}`} ref={dropdownRef}>
        <div className="drawer-header">
          <div className="drawer-title-area">
            <Sparkles size={18} className="title-sparkle" />
            <h3>Dimensiones Nexo</h3>
          </div>
          <button className="close-drawer-btn" onClick={() => setShowFilters(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="drawer-scroll-content">
          <div className="filter-section">
            <p className="subtitle">Filtra el multiverso anime & manga</p>
            <div className="search-input-wrapper">
              <input 
                type="text" 
                placeholder={searchMode === 'anime' ? "Buscar anime..." : "Buscar manga..."} 
                value={tempQuery}
                onChange={(e) => setTempQuery(e.target.value)}
              />
            </div>
          </div>

          {searchMode === 'anime' && (
            <>
              <div className="filter-section">
                <h4>Géneros Totales</h4>
                <div className="genre-cloud">
                  {GENRES.map(g => (
                    <button 
                      key={g} 
                      className={tempSelectedGenres.includes(g) ? 'active' : ''}
                      onClick={() => toggleGenre(g)}
                    >
                      {translateGenre(g)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Animated Selects */}
              <div className="filter-row">
                <div className="filter-item">
                  <h4>Año</h4>
                  <div className={`custom-select-container ${dropdownActive === 'year' ? 'active' : ''}`}>
                    <div className="custom-select-trigger" onClick={() => setDropdownActive(dropdownActive === 'year' ? null : 'year')}>
                      <span>{tempYear || 'Todos'}</span>
                      <ChevronDown size={14} className="select-arrow" />
                    </div>
                    <div className="custom-select-options">
                      <div className={`custom-option ${!tempYear ? 'selected' : ''}`} onClick={() => { setTempYear(''); setDropdownActive(null); }}>Todos</div>
                      {YEARS.map(y => (
                        <div key={y} className={`custom-option ${tempYear === y.toString() ? 'selected' : ''}`} onClick={() => { setTempYear(y.toString()); setDropdownActive(null); }}>
                          {y}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="filter-item">
                  <h4>Temporada</h4>
                  <div className={`custom-select-container ${dropdownActive === 'season' ? 'active' : ''}`}>
                    <div className="custom-select-trigger" onClick={() => setDropdownActive(dropdownActive === 'season' ? null : 'season')}>
                      <span>{translateSeason(tempSeason) || 'Todas'}</span>
                      <ChevronDown size={14} className="select-arrow" />
                    </div>
                    <div className="custom-select-options">
                      <div className={`custom-option ${!tempSeason ? 'selected' : ''}`} onClick={() => { setTempSeason(''); setDropdownActive(null); }}>Todas</div>
                      {SEASONS.map(s => (
                        <div key={s} className={`custom-option ${tempSeason === s ? 'selected' : ''}`} onClick={() => { setTempSeason(s); setDropdownActive(null); }}>
                          {translateSeason(s)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="filter-row">
                <div className="filter-item">
                  <h4>Estado</h4>
                  <div className={`custom-select-container ${dropdownActive === 'status' ? 'active' : ''}`}>
                    <div className="custom-select-trigger" onClick={() => setDropdownActive(dropdownActive === 'status' ? null : 'status')}>
                      <span>{translateStatus(tempStatus) || 'Todos'}</span>
                      <ChevronDown size={14} className="select-arrow" />
                    </div>
                    <div className="custom-select-options">
                      <div className={`custom-option ${!tempStatus ? 'selected' : ''}`} onClick={() => { setTempStatus(''); setDropdownActive(null); }}>Todos</div>
                      {STATUS.map(s => (
                        <div key={s} className={`custom-option ${tempStatus === s ? 'selected' : ''}`} onClick={() => { setTempStatus(s); setDropdownActive(null); }}>
                          {translateStatus(s)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="filter-item">
                  <h4>Formato</h4>
                  <div className={`custom-select-container ${dropdownActive === 'format' ? 'active' : ''}`}>
                    <div className="custom-select-trigger" onClick={() => setDropdownActive(dropdownActive === 'format' ? null : 'format')}>
                      <span>{translateFormat(tempFormat) || 'Todos'}</span>
                      <ChevronDown size={14} className="select-arrow" />
                    </div>
                    <div className="custom-select-options">
                      <div className={`custom-option ${!tempFormat ? 'selected' : ''}`} onClick={() => { setTempFormat(''); setDropdownActive(null); }}>Todos</div>
                      {FORMATS.map(f => (
                        <div key={f} className={`custom-option ${tempFormat === f ? 'selected' : ''}`} onClick={() => { setTempFormat(f); setDropdownActive(null); }}>
                          {translateFormat(f)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {searchMode === 'manga' && (
            <div className="manga-help-box">
              <p>Buscando en la base de datos global de MangaDex. Los filtros de dimensiones sólo aplican para el buscador de Anime.</p>
            </div>
          )}

          <div className="drawer-actions">
            <button className="reset-btn" onClick={() => {
              setTempQuery('');
              setTempSelectedGenres([]);
              setTempYear('');
              setTempSeason('');
              setTempStatus('');
              setTempFormat('');
            }}>
              Reiniciar Multiverso
            </button>
            <button className="apply-btn" onClick={handleApplyFilters}>
              Ver Resultados
            </button>
          </div>
        </div>
      </div>

      <main className="search-results">
        {users.length > 0 && (
          <section className="community-results">
            <h3 className="section-title-alt">Nexo Comunidad</h3>
            <div className="users-grid-horizontal">
              {users.map(u => (
                <Link href={`/dashboard/profile/${u.username}`} key={u.id} className="user-search-card">
                  <div className="user-avatar-wrap">
                    <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}`} alt={u.username} />
                  </div>
                  <div className="user-search-info">
                    <p className="u-name">@{u.username}</p>
                    <p className="u-arch">{u.archetype || 'Explorador'}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <header className="results-header">
          <div className="header-tabs">
            <button 
              className={`tab-btn ${searchMode === 'anime' ? 'active' : ''}`}
              onClick={() => setSearchMode('anime')}
            >
              Anime ({animes.length})
            </button>
            <button 
              className={`tab-btn ${searchMode === 'manga' ? 'active' : ''}`}
              onClick={() => setSearchMode('manga')}
            >
              Manga ({mangas.length})
            </button>
          </div>
          <p>Sincronización híbrida de multiversos: AniList, AniNexo y MangaDex.</p>
        </header>

        {loading ? (
          <div className="galaxy-loading">
            <div className="nebula-spinner">
              <div className="ring ring-outer"></div>
              <div className="ring ring-middle"></div>
              <div className="ring ring-inner"></div>
              <Compass className="compass-center" size={30} />
            </div>
            <h3>Sincronizando Multiversos...</h3>
            <p>Descargando líneas temporales de AniList & MangaDex</p>
          </div>
        ) : searchMode === 'anime' ? (
          <div className="results-grid">
            {animes.map((anime, index) => {
              const animeProps = {
                id: anime.id,
                title: anime.title?.romaji || anime.title,
                coverImage: anime.coverImage?.extraLarge || anime.coverImage,
                score: anime.averageScore || anime.meanScore,
                episodes: anime.episodes,
                status: anime.status,
                genres: anime.genres
              };
              
              if (animes.length === index + 1) {
                return (
                  <div ref={lastAnimeElementRef} key={anime.id}>
                    <AnimeCard {...animeProps} />
                  </div>
                );
              }
              return <AnimeCard key={anime.id} {...animeProps} />;
            })}
          </div>
        ) : (
          <div className="results-grid">
            {mangas.map((manga, index) => {
              const mangaProps = {
                id: manga.id,
                title: manga.title,
                coverUrl: manga.coverUrl,
                author: manga.author,
                status: manga.status,
                tags: manga.tags
              };
              
              if (mangas.length === index + 1) {
                return (
                  <div ref={lastAnimeElementRef} key={manga.id}>
                    <MangaCard {...mangaProps} />
                  </div>
                );
              }
              return <MangaCard key={manga.id} {...mangaProps} />;
            })}
          </div>
        )}

        {!loading && !hasMore && (animes.length > 0 || mangas.length > 0) && (
          <div className="end-msg">Has llegado al final de esta dimensión.</div>
        )}
        
        {animes.length === 0 && mangas.length === 0 && users.length === 0 && !loading && !isInitialLoad && (
          <div className="no-results">
            <div className="no-results-content">
               <span className="icon">🌌</span>
               <h3>No hay coincidencias en esta línea temporal</h3>
               {searchMode === 'manga' && !appliedQuery && <p>Ingresa un término de búsqueda para buscar mangas en MangaDex.</p>}
               {searchMode === 'manga' && appliedQuery && <p>MangaDex no encontró mangas que coincidan con tu búsqueda.</p>}
               {searchMode === 'anime' && <p>Intenta ampliar tus criterios o reinicia los filtros.</p>}
               <button onClick={() => {
                 setTempQuery('');
                 setAppliedQuery('');
               }}>Limpiar Búsqueda</button>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .search-page { display: flex; flex-direction: column; min-height: 100vh; background: #050505; padding-top: 75px; position: relative; }
        
        /* Floating Toggle Button for Drawer */
        .explore-trigger-bar {
          width: 100%;
          display: flex;
          justify-content: center;
          padding: 1.5rem 5% 0.5rem;
          z-index: 90;
        }

        .explore-toggle-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(10, 10, 12, 0.85);
          border: 1px solid rgba(0, 229, 255, 0.2);
          padding: 12px 24px;
          border-radius: 30px;
          color: #fff;
          font-weight: 800;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          backdrop-filter: blur(15px);
        }

        .explore-toggle-btn:hover, .explore-toggle-btn.active {
          border-color: #00E5FF;
          box-shadow: 0 0 15px rgba(0, 229, 255, 0.4);
          transform: translateY(-2px);
        }

        .icon-explore {
          color: #00E5FF;
          animation: pulse 2s infinite;
        }

        .filter-count-badge {
          background: #00E5FF;
          color: #000;
          font-size: 0.75rem;
          font-weight: 900;
          padding: 2px 7px;
          border-radius: 10px;
        }

        .arrow-icon {
          color: #888;
          transition: transform 0.3s;
        }
        
        .arrow-icon.rotated {
          transform: rotate(180deg);
          color: #00E5FF;
        }

        /* Dropdown Drawer */
        .filters-drawer {
          position: absolute;
          top: 140px;
          left: 50%;
          transform: translateX(-50%) translateY(-20px);
          width: 90%;
          max-width: 600px;
          background: rgba(8, 8, 10, 0.95);
          border: 1px solid rgba(0, 229, 255, 0.25);
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.8);
          z-index: 100;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(20px);
        }

        .filters-drawer.open {
          opacity: 1;
          visibility: visible;
          pointer-events: all;
          transform: translateX(-50%) translateY(0);
        }

        .filters-drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 95;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s;
        }

        .filters-drawer-overlay.show {
          opacity: 1;
          visibility: visible;
        }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 25px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .drawer-title-area {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .title-sparkle {
          color: #00E5FF;
        }

        .drawer-header h3 {
          font-size: 1.25rem;
          font-weight: 900;
          color: #fff;
          margin: 0;
        }

        .close-drawer-btn {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          transition: color 0.2s;
        }

        .close-drawer-btn:hover {
          color: #fff;
        }

        .drawer-scroll-content {
          padding: 25px;
          max-height: 70vh;
          overflow-y: auto;
        }

        .filter-section { margin-bottom: 2rem; }
        .subtitle { font-size: 0.85rem; color: #888; margin-bottom: 1.2rem; }
        .filter-section h4 { font-size: 0.75rem; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.8rem; font-weight: 800; }
        
        .search-input-wrapper input { 
          width: 100%; 
          background: rgba(255,255,255,0.03); 
          border: 1px solid rgba(0, 229, 255, 0.15); 
          padding: 14px 18px; 
          border-radius: 12px; 
          color: white; 
          outline: none; 
          font-size: 0.95rem;
          transition: all 0.3s; 
        }
        
        .search-input-wrapper input:focus {
          border-color: #00E5FF;
          box-shadow: 0 0 10px rgba(0, 229, 255, 0.15);
        }

        .genre-cloud { display: flex; flex-wrap: wrap; gap: 6px; }
        .genre-cloud button { 
          background: rgba(255,255,255,0.02); 
          border: 1px solid rgba(255,255,255,0.05); 
          padding: 6px 12px; 
          border-radius: 8px; 
          color: #888; 
          font-size: 0.75rem; 
          cursor: pointer; 
          transition: all 0.2s;
        }
        .genre-cloud button:hover {
          border-color: rgba(0, 229, 255, 0.3);
          color: #fff;
        }
        .genre-cloud button.active { background: #00E5FF; border-color: #00E5FF; color: #000; font-weight: 800; }
        
        .filter-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 1.5rem; }
        
        /* Custom Dropdowns */
        .custom-select-container {
          position: relative;
          width: 100%;
        }

        .custom-select-trigger {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          padding: 12px 16px;
          border-radius: 8px;
          color: #ccc;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.25s ease;
        }

        .custom-select-trigger:hover, .custom-select-container.active .custom-select-trigger {
          border-color: #00E5FF;
          box-shadow: 0 0 10px rgba(0, 229, 255, 0.1);
        }

        .select-arrow {
          color: #666;
          transition: transform 0.25s ease;
        }

        .custom-select-container.active .select-arrow {
          transform: rotate(180deg);
          color: #00E5FF;
        }

        .custom-select-options {
          position: absolute;
          top: calc(100% + 5px);
          left: 0;
          right: 0;
          background: #0d0d12;
          border: 1px solid rgba(0, 229, 255, 0.2);
          border-radius: 8px;
          max-height: 220px;
          overflow-y: auto;
          z-index: 120;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          opacity: 0;
          visibility: hidden;
          transform: translateY(-10px);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .custom-select-container.active .custom-select-options {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .custom-option {
          padding: 10px 16px;
          color: #aaa;
          cursor: pointer;
          font-size: 0.88rem;
          transition: all 0.2s;
        }

        .custom-option:hover {
          background: rgba(0, 229, 255, 0.08);
          color: #fff;
        }

        .custom-option.selected {
          background: rgba(0, 229, 255, 0.15);
          color: #00E5FF;
          font-weight: bold;
        }

        /* Scrollbar styles for custom select */
        .custom-select-options::-webkit-scrollbar {
          width: 5px;
        }
        .custom-select-options::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-select-options::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-select-options::-webkit-scrollbar-thumb:hover {
          background: #00E5FF;
        }

        .drawer-actions {
          display: flex;
          gap: 15px;
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .reset-btn { 
          flex: 1;
          padding: 14px; 
          background: transparent; 
          border: 1px solid rgba(255, 255, 255, 0.1); 
          color: #888; 
          border-radius: 12px; 
          font-weight: 700;
          cursor: pointer; 
          transition: all 0.2s;
        }
        .reset-btn:hover {
          border-color: #ff4d4d;
          color: #ff4d4d;
        }

        .apply-btn {
          flex: 2;
          padding: 14px;
          background: #00E5FF;
          border: none;
          color: #000;
          font-weight: 900;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .apply-btn:hover {
          box-shadow: 0 0 15px rgba(0, 229, 255, 0.5);
          transform: translateY(-1px);
        }
        
        .manga-help-box { background: rgba(0, 229, 255, 0.03); border: 1px solid rgba(0, 229, 255, 0.15); border-radius: 12px; padding: 15px; color: #aaa; font-size: 0.85rem; line-height: 1.5; margin-bottom: 1rem; }
        
        /* Results Section */
        .search-results { padding: 2rem 5% 5rem; width: 100%; }
        .section-title-alt { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; color: #00E5FF; margin-bottom: 20px; font-weight: 900; }
        .community-results { margin-bottom: 50px; padding-bottom: 30px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .users-grid-horizontal { display: flex; gap: 20px; overflow-x: auto; padding-bottom: 10px; }
        .user-search-card { min-width: 200px; background: rgba(255,255,255,0.02); padding: 20px; border-radius: 20px; display: flex; align-items: center; gap: 15px; text-decoration: none; border: 1px solid rgba(255,255,255,0.04); transition: all 0.3s; }
        .user-search-card:hover { transform: translateY(-5px); background: rgba(255,255,255,0.04); border-color: #00E5FF; }
        .user-avatar-wrap { width: 50px; height: 50px; border-radius: 50%; overflow: hidden; }
        .user-avatar-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .u-name { color: #fff; font-weight: 700; margin: 0; font-size: 0.95rem; }
        .u-arch { color: #555; font-size: 0.75rem; margin: 2px 0 0 0; }

        .results-header { margin-bottom: 3rem; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 1.5rem; }
        .header-tabs { display: flex; gap: 25px; margin-bottom: 10px; }
        .tab-btn { background: transparent; border: none; font-size: 2.2rem; font-weight: 950; color: #333; cursor: pointer; padding: 0; position: relative; transition: color 0.3s; }
        .tab-btn.active { color: #fff; }
        .tab-btn.active::after { content: ''; position: absolute; bottom: -8px; left: 0; right: 0; height: 4px; background: #00E5FF; border-radius: 2px; }
        
        .results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 30px; }
        
        /* Galaxy Loading Animation */
        .galaxy-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 8rem 2rem;
          text-align: center;
        }

        .nebula-spinner {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 25px;
        }

        .ring {
          position: absolute;
          border-radius: 50%;
          border: 2px solid transparent;
        }

        .ring-outer {
          width: 80px;
          height: 80px;
          border-top-color: #00E5FF;
          animation: spin-clockwise 2s linear infinite;
        }

        .ring-middle {
          width: 60px;
          height: 60px;
          border-right-color: #FF007F;
          animation: spin-counterclockwise 1.5s linear infinite;
        }

        .ring-inner {
          width: 40px;
          height: 40px;
          border-bottom-color: #7000FF;
          animation: spin-clockwise 1s linear infinite;
        }

        .compass-center {
          color: #00E5FF;
          filter: drop-shadow(0 0 8px rgba(0, 229, 255, 0.6));
          animation: pulse 1.5s ease-in-out infinite;
        }

        .galaxy-loading h3 {
          font-size: 1.3rem;
          font-weight: 800;
          color: #fff;
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
        }

        .galaxy-loading p {
          color: #555;
          font-size: 0.85rem;
          margin: 0;
        }

        @keyframes spin-clockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes spin-counterclockwise {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        
        .end-msg { grid-column: 1 / -1; text-align: center; color: #444; padding: 3rem 0; font-size: 0.9rem; font-weight: bold; }
        .no-results { grid-column: 1 / -1; display: flex; justify-content: center; padding: 5rem 0; }
        .no-results-content { text-align: center; max-width: 400px; }
        .no-results-content .icon { font-size: 3rem; display: block; margin-bottom: 1rem; }
        .no-results-content h3 { font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; }
        .no-results-content p { color: #555; font-size: 0.9rem; margin-bottom: 1.5rem; }
        .no-results-content button { background: #00E5FF; color: #000; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; }

        @media (max-width: 768px) {
          .filters-drawer {
            width: 95%;
          }
          .tab-btn {
            font-size: 1.6rem;
          }
        }
      `}</style>
    </div>
  );
}

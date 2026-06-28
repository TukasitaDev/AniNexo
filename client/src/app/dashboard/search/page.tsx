'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AnimeCard } from '../../../components/discovery/AnimeCard';
import { MangaCard } from '../../../components/discovery/MangaCard';
import Link from 'next/link';

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
  
  const observer = useRef<IntersectionObserver | null>(null);

  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(searchParams.get('genres')?.split(',').filter(Boolean) || []);
  const [year, setYear] = useState(searchParams.get('year') || '');
  const [season, setSeason] = useState(searchParams.get('season') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [format, setFormat] = useState(searchParams.get('format') || '');

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
      // 1. Cargar Usuarios y Mangas para búsqueda global en primera página si hay query
      if (pageNum === 1 && query) {
        try {
          const resUser = await fetch(`${apiUrl}/search/global?q=${encodeURIComponent(query)}`);
          const globalData = await resUser.json();
          if (globalData.success) {
            setUsers(globalData.data.users || []);
            // Si estamos en modo anime pero devuelve mangas, o viceversa, actualizamos el pool secundario
            if (searchMode === 'manga') {
              setMangas(globalData.data.mangas || []);
            }
          }
        } catch (err) { console.error(err); }
      } else if (!query) {
        setUsers([]);
      }

      if (searchMode === 'anime') {
        const params = new URLSearchParams();
        if (query) params.append('query', query);
        if (selectedGenres.length > 0) params.append('genres', selectedGenres.join(','));
        if (year) params.append('year', year);
        if (season) params.append('season', season);
        if (status) params.append('status', status);
        if (format) params.append('format', format);
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
        // Modo Manga (MangaDex)
        if (query) {
          const offset = (pageNum - 1) * 20;
          const res = await fetch(`${apiUrl}/manga/search?q=${encodeURIComponent(query)}&limit=20&offset=${offset}`);
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
    const timer = setTimeout(() => {
      setAnimes([]);
      setMangas([]);
      setPage(1);
      setHasMore(true);
      fetchResults(1, true);
    }, 500);
    return () => clearTimeout(timer);
  }, [query, searchMode]);

  useEffect(() => {
    setAnimes([]);
    setMangas([]);
    setPage(1);
    setHasMore(true);
    fetchResults(1, true);
    
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (selectedGenres.length > 0) params.append('genres', selectedGenres.join(','));
    if (year) params.append('year', year);
    if (season) params.append('season', season);
    if (status) params.append('status', status);
    if (format) params.append('format', format);
    router.replace(`/dashboard/search?${params.toString()}`, { scroll: false });
  }, [selectedGenres, year, season, status, format]);

  useEffect(() => {
    if (page > 1) fetchResults(page);
  }, [page]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]);
  };

  return (
    <div className="search-page">
      <aside className="filter-sidebar">
        <div className="filter-section">
          <h3>Dimensiones Nexo</h3>
          <p className="subtitle">Filtra el multiverso anime & manga</p>
          <div className="search-input-wrapper">
            <input 
              type="text" 
              placeholder={searchMode === 'anime' ? "Buscar anime..." : "Buscar manga..."} 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
                    className={selectedGenres.includes(g) ? 'active' : ''}
                    onClick={() => toggleGenre(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-item">
                <h4>Año</h4>
                <select value={year} onChange={(e) => setYear(e.target.value)}>
                  <option value="">Todos</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <h4>Temporada</h4>
                <select value={season} onChange={(e) => setSeason(e.target.value)}>
                  <option value="">Todas</option>
                  {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-item">
                <h4>Estado</h4>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Todos</option>
                  {STATUS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <h4>Formato</h4>
                <select value={format} onChange={(e) => setFormat(e.target.value)}>
                  <option value="">Todos</option>
                  {FORMATS.map(f => <option key={f} value={f}>{f.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
          </>
        )}

        {searchMode === 'manga' && (
          <div className="manga-help-box">
            <p>Buscando en la base de datos global de MangaDex. Los filtros de dimensiones sólo aplican para el buscador de Anime.</p>
          </div>
        )}

        <button className="reset-btn" onClick={() => {
          setQuery('');
          setSelectedGenres([]);
          setYear('');
          setSeason('');
          setStatus('');
          setFormat('');
        }}>
          Reiniciar Multiverso
        </button>
      </aside>

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

        {searchMode === 'anime' ? (
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

        {loading && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>Sincronizando con la API...</span>
          </div>
        )}

        {!hasMore && (animes.length > 0 || mangas.length > 0) && (
          <div className="end-msg">Has llegado al final de esta dimensión.</div>
        )}
        
        {animes.length === 0 && mangas.length === 0 && users.length === 0 && !loading && !isInitialLoad && (
          <div className="no-results">
            <div className="no-results-content">
               <span className="icon">🌌</span>
               <h3>No hay coincidencias en esta línea temporal</h3>
               {searchMode === 'manga' && !query && <p>Ingresa un término de búsqueda para buscar mangas en MangaDex.</p>}
               {searchMode === 'manga' && query && <p>MangaDex no encontró mangas que coincidan con tu búsqueda.</p>}
               {searchMode === 'anime' && <p>Intenta ampliar tus criterios o reinicia los filtros.</p>}
               <button onClick={() => setQuery('')}>Limpiar Búsqueda</button>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .search-page { display: grid; grid-template-columns: 320px 1fr; min-height: 100vh; background: #050505; padding-top: 75px; }
        .filter-sidebar { padding: 2.5rem 1.5rem; background: rgba(10, 10, 10, 0.95); backdrop-filter: blur(10px); border-right: 1px solid rgba(255,255,255,0.03); height: calc(100vh - 75px); position: sticky; top: 75px; overflow-y: auto; }
        .filter-section { margin-bottom: 2.5rem; }
        .filter-section h3 { font-size: 1.4rem; font-weight: 900; color: #fff; margin-bottom: 5px; }
        .subtitle { font-size: 0.8rem; color: #555; margin-bottom: 1.5rem; }
        .filter-section h4 { font-size: 0.75rem; color: #444; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1rem; font-weight: 800; }
        .search-input-wrapper input { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 14px 18px; border-radius: 12px; color: white; outline: none; transition: all 0.3s; }
        .genre-cloud { display: flex; flex-wrap: wrap; gap: 6px; }
        .genre-cloud button { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 5px 10px; border-radius: 6px; color: #777; font-size: 0.75rem; cursor: pointer; }
        .genre-cloud button.active { background: #00E5FF; color: #000; font-weight: 800; }
        .filter-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 1.2rem; }
        .filter-item select { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 10px; border-radius: 8px; color: #ccc; }
        .reset-btn { width: 100%; padding: 14px; margin-top: 1rem; background: transparent; border: 1px solid rgba(255, 255, 255, 0.1); color: #666; border-radius: 12px; cursor: pointer; }
        
        .manga-help-box { background: rgba(0, 229, 255, 0.05); border: 1px solid rgba(0, 229, 255, 0.2); border-radius: 12px; padding: 15px; color: #ccc; font-size: 0.85rem; line-height: 1.5; margin-bottom: 2rem; }
        
        .search-results { padding: 3rem 5%; }
        .section-title-alt { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; color: #00E5FF; margin-bottom: 20px; font-weight: 900; }
        .community-results { margin-bottom: 50px; padding-bottom: 30px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .users-grid-horizontal { display: flex; gap: 20px; overflow-x: auto; padding-bottom: 10px; }
        .user-search-card { min-width: 200px; background: rgba(255,255,255,0.03); padding: 20px; border-radius: 20px; display: flex; align-items: center; gap: 15px; text-decoration: none; border: 1px solid rgba(255,255,255,0.05); transition: all 0.3s; }
        .user-search-card:hover { transform: translateY(-5px); background: rgba(255,255,255,0.06); border-color: #00E5FF; }
        .user-avatar-wrap { width: 50px; height: 50px; border-radius: 50%; overflow: hidden; }
        .user-avatar-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .u-name { color: #fff; font-weight: 700; margin: 0; font-size: 0.95rem; }
        .u-arch { color: #555; font-size: 0.75rem; margin: 2px 0 0 0; }

        .results-header { margin-bottom: 4rem; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 2rem; }
        .header-tabs { display: flex; gap: 20px; margin-bottom: 10px; }
        .tab-btn { background: transparent; border: none; font-size: 2.2rem; font-weight: 950; color: #444; cursor: pointer; padding: 0; position: relative; transition: color 0.3s; }
        .tab-btn.active { color: #fff; }
        .tab-btn.active::after { content: ''; position: absolute; bottom: -8px; left: 0; right: 0; height: 4px; background: #00E5FF; border-radius: 2px; }
        .results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 40px; }
        
        .loading-spinner { display: flex; flex-direction: column; align-items: center; gap: 15px; padding: 5rem; }
        .spinner { width: 35px; height: 35px; border: 3px solid rgba(0, 229, 255, 0.05); border-left-color: #00E5FF; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .end-msg { grid-column: 1 / -1; text-align: center; color: #444; padding: 3rem 0; font-size: 0.9rem; font-weight: bold; }
        .no-results { grid-column: 1 / -1; display: flex; justify-content: center; padding: 5rem 0; }
        .no-results-content { text-align: center; max-width: 400px; }
        .no-results-content .icon { font-size: 3rem; display: block; margin-bottom: 1rem; }
        .no-results-content h3 { font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; }
        .no-results-content p { color: #555; font-size: 0.9rem; margin-bottom: 1.5rem; }
        .no-results-content button { background: #00E5FF; color: #000; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; }
      `}</style>
    </div>
  );
}

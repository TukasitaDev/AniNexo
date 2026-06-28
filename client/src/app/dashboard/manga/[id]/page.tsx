'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MangaDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [manga, setManga] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchMangaData = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        
        // 1. Obtener detalles del Manga
        const detailsRes = await fetch(`${apiUrl}/manga/${id}`);
        const detailsJson = await detailsRes.json();
        if (!detailsJson.success) {
          throw new Error('No se encontraron detalles para este manga.');
        }
        setManga(detailsJson.data);

        // 2. Obtener capítulos
        const chaptersRes = await fetch(`${apiUrl}/manga/${id}/chapters`);
        const chaptersJson = await chaptersRes.json();
        if (chaptersJson.success) {
          setChapters(chaptersJson.data.chapters || []);
        }
      } catch (err: any) {
        setError(err.message || 'Error cargando datos del manga');
      } finally {
        setLoading(false);
      }
    };

    fetchMangaData();
  }, [id]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Sincronizando con los servidores de MangaDex...</p>
        <style jsx>{`
          .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #050505; color: #fff; }
          .spinner { width: 50px; height: 50px; border: 3px solid rgba(0, 229, 255, 0.1); border-left-color: #00E5FF; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error || !manga) {
    return (
      <div className="error-container">
        <h2>Falla en el Enlace Temporal</h2>
        <p>{error || 'Manga no encontrado'}</p>
        <button onClick={() => router.back()}>Regresar</button>
        <style jsx>{`
          .error-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #050505; color: #fff; gap: 20px; }
          button { background: #00E5FF; color: #000; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 800; cursor: pointer; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="manga-detail-page">
      <div className="manga-hero" style={{ backgroundImage: `linear-gradient(to bottom, rgba(5,5,5,0.3), #050505), url(${manga.coverUrl})` }}>
        <div className="hero-content">
          <div className="cover-wrapper">
            <img src={manga.coverUrl} alt={manga.title} />
          </div>
          <div className="manga-info">
            <h1 className="title">{manga.title}</h1>
            <div className="meta-row">
              <span className="badge-author">Autor: {manga.author}</span>
              <span className="dot">•</span>
              <span className="badge-artist">Artista: {manga.artist}</span>
              <span className="dot">•</span>
              <span className="status">{manga.status}</span>
              {manga.year && (
                <>
                  <span className="dot">•</span>
                  <span>{manga.year}</span>
                </>
              )}
            </div>
            <div className="tags-row">
              {manga.tags?.map((tag: string) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="manga-body">
        <section className="description-section">
          <h2>Sinopsis</h2>
          <p className="description-text">{manga.description}</p>
        </section>

        <section className="chapters-section">
          <h2>Capítulos Disponibles</h2>
          {chapters.length === 0 ? (
            <p className="no-chapters">No se encontraron capítulos en español o inglés disponibles para lectura directa.</p>
          ) : (
            <div className="chapters-list">
              {chapters.map((ch) => (
                <Link key={ch.id} href={`/dashboard/manga/read/${ch.id}`} className="chapter-item">
                  <div className="chapter-info">
                    <span className="chapter-num">Capítulo {ch.chapter}</span>
                    {ch.title && <span className="chapter-title">- {ch.title}</span>}
                  </div>
                  <div className="chapter-meta">
                    <span className="language">{ch.language === 'en' ? '🇬🇧 EN' : '🇪🇸 ES'}</span>
                    <span className="group">{ch.scanGroup}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        .manga-detail-page { background: #050505; color: #fff; min-height: 100vh; padding-bottom: 5rem; }
        .manga-hero { height: 450px; background-size: cover; background-position: center; display: flex; align-items: flex-end; padding: 0 5% 2rem; position: relative; border-bottom: 1px solid rgba(255,255,255,0.05); }
        
        .hero-content { display: flex; gap: 30px; align-items: flex-end; z-index: 2; width: 100%; max-width: 1200px; margin: 0 auto; }
        .cover-wrapper { width: 180px; aspect-ratio: 2/3; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.8); border: 2px solid rgba(0, 229, 255, 0.4); transform: translateY(30px); }
        .cover-wrapper img { width: 100%; height: 100%; object-fit: cover; }
        
        .manga-info { flex: 1; display: flex; flex-direction: column; gap: 12px; }
        .title { font-size: 2.5rem; font-weight: 900; line-height: 1.2; text-shadow: 0 2px 10px rgba(0,0,0,0.8); }
        .meta-row { display: flex; gap: 15px; align-items: center; color: #aaa; font-size: 0.9rem; }
        .dot { color: #00E5FF; }
        .status { text-transform: uppercase; font-weight: bold; color: #00E5FF; }
        .tags-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .tag { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; color: #ccc; }

        .manga-body { max-width: 1200px; margin: 50px auto 0; padding: 0 5%; display: grid; grid-template-columns: 1fr 380px; gap: 50px; }
        @media (max-width: 900px) {
          .manga-body { grid-template-columns: 1fr; }
          .cover-wrapper { transform: none; width: 140px; }
          .manga-hero { height: auto; padding-top: 100px; }
          .hero-content { flex-direction: column; align-items: center; text-align: center; }
          .meta-row { justify-content: center; flex-wrap: wrap; }
          .tags-row { justify-content: center; }
        }

        h2 { font-size: 1.3rem; font-weight: 800; border-left: 4px solid #00E5FF; padding-left: 12px; margin-bottom: 20px; color: #fff; text-transform: uppercase; letter-spacing: 1px; }
        
        .description-section { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 30px; border-radius: 20px; }
        .description-text { font-size: 1rem; color: #ccc; line-height: 1.7; white-space: pre-line; }
        
        .chapters-section { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 30px; border-radius: 20px; max-height: 600px; overflow-y: auto; }
        .chapters-list { display: flex; flex-direction: column; gap: 10px; }
        .chapter-item { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; text-decoration: none; color: #fff; transition: all 0.3s; }
        .chapter-item:hover { background: rgba(0, 229, 255, 0.05); border-color: #00E5FF; transform: translateX(5px); }
        .chapter-info { font-weight: 700; display: flex; gap: 8px; }
        .chapter-title { color: #aaa; font-weight: 400; font-size: 0.9rem; }
        .chapter-meta { display: flex; gap: 15px; align-items: center; font-size: 0.8rem; }
        .language { background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; }
        .group { color: #888; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .no-chapters { color: #666; text-align: center; padding: 2rem 0; }
      `}</style>
    </div>
  );
}

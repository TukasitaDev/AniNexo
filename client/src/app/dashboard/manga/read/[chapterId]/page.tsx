'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function MangaReaderPage() {
  const { chapterId } = useParams();
  const router = useRouter();
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!chapterId) return;

    const fetchPages = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const res = await fetch(`${apiUrl}/manga/chapter/${chapterId}`);
        const json = await res.json();
        
        if (!json.success) {
          throw new Error('No se pudieron recuperar las páginas para este capítulo.');
        }

        setPages(json.data.pages || []);
      } catch (err: any) {
        setError(err.message || 'Error cargando páginas del capítulo');
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
  }, [chapterId]);

  if (loading) {
    return (
      <div className="reader-loading">
        <div className="spinner"></div>
        <p>Cargando páginas del capítulo desde servidores distribuidos...</p>
        <style jsx>{`
          .reader-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #000; color: #fff; }
          .spinner { width: 50px; height: 50px; border: 3px solid rgba(0, 229, 255, 0.1); border-left-color: #00E5FF; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error || pages.length === 0) {
    return (
      <div className="reader-error">
        <h2>Falla en el Decodificador de Capítulos</h2>
        <p>{error || 'No hay páginas disponibles para este capítulo'}</p>
        <button onClick={() => router.back()}>Regresar al Manga</button>
        <style jsx>{`
          .reader-error { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #000; color: #fff; gap: 20px; }
          button { background: #00E5FF; color: #000; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 800; cursor: pointer; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="manga-reader-page">
      <header className="reader-header">
        <button className="back-btn" onClick={() => router.back()}>
          ← Volver
        </button>
        <div className="header-info">
          <span>Modo Lectura (Cascada)</span>
        </div>
      </header>

      <main className="pages-container">
        {pages.map((url, index) => (
          <div key={index} className="page-wrapper">
            <img src={url} alt={`Página ${index + 1}`} loading="lazy" />
            <div className="page-number">{index + 1} / {pages.length}</div>
          </div>
        ))}
      </main>

      <style jsx>{`
        .manga-reader-page { background: #000; min-height: 100vh; color: #fff; padding-top: 70px; }
        .reader-header { position: fixed; top: 0; left: 0; right: 0; height: 70px; background: rgba(5, 5, 5, 0.95); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: space-between; padding: 0 5%; border-bottom: 1px solid rgba(255,255,255,0.05); z-index: 100; }
        .back-btn { background: transparent; border: 1px solid rgba(255, 255, 255, 0.15); color: #fff; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: all 0.3s; }
        .back-btn:hover { background: #00E5FF; color: #000; border-color: #00E5FF; }
        .header-info { font-weight: bold; color: #00E5FF; letter-spacing: 1px; font-size: 0.85rem; text-transform: uppercase; }

        .pages-container { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; background: #000; padding: 20px 0; }
        .page-wrapper { width: 100%; position: relative; display: flex; flex-direction: column; align-items: center; margin-bottom: 15px; }
        .page-wrapper img { width: 100%; height: auto; object-fit: contain; }
        .page-number { margin-top: 8px; color: #666; font-size: 0.8rem; font-weight: 700; }
      `}</style>
    </div>
  );
}

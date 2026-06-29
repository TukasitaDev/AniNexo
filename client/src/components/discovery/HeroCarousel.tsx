'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { translateStatus, translateGenre, stripHtml } from '../../lib/translations';

interface Slide {
  id: number;
  title: { romaji: string; english?: string };
  description: string;
  bannerImage: string;
  coverImage: { extraLarge: string };
  averageScore: number;
  genres: string[];
  status: string;
  season: string;
  seasonYear: number;
  studios: { nodes: { name: string }[] };
}

export const HeroCarousel: React.FC<{ slides: Slide[] }> = ({ slides }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!slides || slides.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [slides]);

  if (!slides || slides.length === 0) return null;

  const current = slides[currentIndex];

  const cleanDescription = (html: string) => {
    return stripHtml(html)?.slice(0, 200) + '...';
  };

  return (
    <section className="hero-container">
      <div className="slide-background">
        <img src={current.bannerImage || current.coverImage.extraLarge} alt={current.title.romaji} className="banner-image" />
        <div className="overlay-v"></div>
        <div className="overlay-h"></div>
      </div>

      <div className="hero-content">
        <div className="content-inner">
          <div className="badge-row">
            <span className="trending-badge">🔥 TENDENCIA</span>
            <span className="score-label">⭐ {current.averageScore / 10} / 10</span>
          </div>

          <h1 className="hero-title">{current.title.romaji}</h1>
          
          <div className="meta-row">
            <span className="year">{current.seasonYear}</span>
            <span className="dot">•</span>
            {current.studios?.nodes?.[0] && (
              <>
                <span className="studio">{current.studios.nodes[0].name}</span>
                <span className="dot">•</span>
              </>
            )}
            <span className="status">{translateStatus(current.status)}</span>
          </div>

          <div className="genre-row">
            {current.genres.slice(0, 3).map(g => <span key={g}>{translateGenre(g)}</span>)}
          </div>

          <p className="hero-description">{cleanDescription(current.description)}</p>

          <div className="action-row">
            <Link href={`/dashboard/anime/${current.id}`}>
              <button className="btn-primary">Ver Detalles</button>
            </Link>
            <button className="btn-outline">+ Mi Lista</button>
          </div>
        </div>
      </div>

      {/* Indicadores */}
      <div className="carousel-indicators">
        {slides.map((_, idx) => (
          <div 
            key={idx} 
            className={`indicator ${idx === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(idx)}
          />
        ))}
      </div>

      <style jsx>{`
        .hero-container {
          position: relative;
          height: 85vh;
          width: 100%;
          overflow: hidden;
          background: #000;
          margin-bottom: -50px; /* Blend con el contenido */
        }

        .slide-background {
          position: absolute;
          inset: 0;
        }

        .banner-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.6;
          transition: opacity 1s ease;
        }

        .overlay-v {
          position: absolute;
          inset: 0;
          background: linear-gradient(0deg, #050505 10%, transparent 50%);
        }

        .overlay-h {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, #050505 10%, transparent 60%);
        }

        .hero-content {
          position: relative;
          height: 100%;
          display: flex;
          align-items: center;
          padding: 0 5%;
          z-index: 2;
        }

        .content-inner {
          max-width: 650px;
          animation: fadeInUp 0.8s ease;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .badge-row {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
        }

        .trending-badge {
          background: var(--color-primary);
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          font-weight: 800;
          font-size: 0.75rem;
          letter-spacing: 1px;
        }

        .score-label {
          color: #00E5FF;
          font-weight: 700;
        }

        .hero-title {
          font-size: 4.5rem;
          font-weight: 900;
          color: #fff;
          margin: 0 0 15px 0;
          line-height: 0.9;
          letter-spacing: -2px;
        }

        .meta-row {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #aaa;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .dot { color: var(--color-primary); }

        .genre-row {
          display: flex;
          gap: 10px;
          margin-bottom: 25px;
        }

        .genre-row span {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 0.85rem;
          color: #eee;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .hero-description {
          font-size: 1.1rem;
          color: #bbb;
          line-height: 1.6;
          margin-bottom: 35px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .action-row {
          display: flex;
          gap: 20px;
        }

        .btn-primary {
          background: var(--color-primary);
          color: white;
          border: none;
          padding: 15px 40px;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .btn-outline {
          background: rgba(255,255,255,0.1);
          color: white;
          border: 1px solid rgba(255,255,255,0.2);
          padding: 15px 30px;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(10px);
        }

        .btn-primary:hover, .btn-outline:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.3);
        }

        .carousel-indicators {
          position: absolute;
          bottom: 100px;
          right: 5%;
          display: flex;
          gap: 10px;
          z-index: 10;
        }

        .indicator {
          width: 30px;
          height: 4px;
          background: rgba(255,255,255,0.2);
          cursor: pointer;
          transition: all 0.3s;
        }

        .indicator.active {
          background: var(--color-primary);
          width: 50px;
        }

        @media (max-width: 768px) {
          .hero-title { font-size: 2.5rem; }
          .hero-description { font-size: 0.9rem; }
          .hero-container { height: 70vh; }
        }
      `}</style>
    </section>
  );
};

'use client';

import React from 'react';
import Link from 'next/link';

interface MangaCardProps {
  id: string;
  title: string;
  coverUrl: string;
  author?: string;
  status?: string;
  tags?: string[];
}

export const MangaCard: React.FC<MangaCardProps> = ({ 
  id, 
  title, 
  coverUrl, 
  author, 
  status,
  tags 
}) => {
  return (
    <Link href={`/dashboard/manga/${id}`} style={{ textDecoration: 'none' }}>
      <div className="manga-card-container">
        <div className="manga-card">
          <div className="poster-wrapper">
            <img src={coverUrl} alt={title} className="poster-image" loading="lazy" />
            
            {status && (
              <div className="status-badge">
                {status}
              </div>
            )}
          </div>

          <div className="card-overlay">
            <div className="overlay-content">
              <h3 className="overlay-title">{title}</h3>
              <div className="overlay-meta">
                <span>By: {author || 'Desconocido'}</span>
              </div>
              <div className="overlay-genres">
                {tags?.slice(0, 2).map(tag => (
                  <span key={tag} className="genre-tag">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <h4 className="card-external-title">{title}</h4>

        <style jsx>{`
          .manga-card-container {
            width: 200px;
            transition: transform 0.3s ease;
          }

          .manga-card {
            position: relative;
            width: 100%;
            aspect-ratio: 2/3;
            border-radius: 12px;
            overflow: hidden;
            background-color: #111;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            cursor: pointer;
          }

          .poster-wrapper {
            width: 100%;
            height: 100%;
          }

          .poster-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.5s ease;
          }

          .status-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0, 229, 255, 0.9);
            color: #000;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 0.7rem;
            font-weight: bold;
            text-transform: uppercase;
            box-shadow: 0 0 10px rgba(0, 229, 255, 0.4);
          }

          .card-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0,0,0,0.95) 80%);
            padding: 20px 15px 15px;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
          }

          .overlay-content {
            color: white;
          }

          .overlay-title {
            margin: 0 0 8px 0;
            font-size: 1rem;
            line-height: 1.2;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .overlay-meta {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.75rem;
            color: #ccc;
            margin-bottom: 8px;
          }

          .overlay-genres {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
          }

          .genre-tag {
            background: rgba(255,255,255,0.1);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.65rem;
            color: #aaa;
          }

          .card-external-title {
            margin: 10px 0 0 0;
            font-size: 0.9rem;
            color: #eee;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: 500;
          }

          .manga-card-container:hover {
            transform: scale(1.05);
            z-index: 10;
          }

          .manga-card-container:hover .poster-image {
            transform: scale(1.1);
          }

          .manga-card-container:hover .card-overlay {
            opacity: 1;
            transform: translateY(0);
          }

          .manga-card-container:hover .manga-card {
            box-shadow: 0 0 25px rgba(0, 229, 255, 0.2);
            border: 1px solid rgba(0, 229, 255, 0.3);
          }
        `}</style>
      </div>
    </Link>
  );
};

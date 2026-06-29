import React from 'react';
import { AnimeNode } from '../core/VisibilityManager';
import { translateStatus, translateGenre } from '../../../lib/translations';

interface HoverCardProps {
  anime: AnimeNode;
  x: number;
  y: number;
}

export const HoverCard: React.FC<HoverCardProps> = ({ anime, x, y }) => {
  return (
    <div
      className="fixed z-50 pointer-events-none select-none transition-all duration-75 ease-out"
      style={{
        left: `${x + 20}px`,
        top: `${y - 120}px`,
      }}
    >
      <div className="w-[300px] p-5 rounded-xl border border-[#00E5FF]/25 bg-[#030712]/80 backdrop-blur-md shadow-[0_0_30px_rgba(0,229,255,0.15)] text-white">
        {/* Genre Tags */}
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {anime.genres.slice(0, 2).map((genre) => (
            <span
              key={genre}
              className="text-[9px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[#00E5FF]"
            >
              {translateGenre(genre)}
            </span>
          ))}
          <span className="text-[9px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400 ml-auto">
            {translateStatus(anime.status)}
          </span>
        </div>

        {/* Title */}
        <h4 className="text-base font-bold leading-snug tracking-tight mb-2 text-white line-clamp-2">
          {anime.title}
        </h4>

        {/* Score and Stats */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
          <div>
            <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
              Recomendación IA
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-[#00E5FF]">{anime.score}%</span>
              <span className="text-[10px] text-gray-500">compatibilidad</span>
            </div>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse ml-auto" />
        </div>
      </div>
    </div>
  );
};

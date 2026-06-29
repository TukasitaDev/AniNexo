"use client";

import { useState, useEffect } from 'react';

export interface SiteStats {
  users: number;
  animes: number;
  upcoming: Array<{ feature: string; eta: string }>;
}

export const useSiteStats = () => {
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Función auxiliar para fetch seguro
        const safeFetchJson = async (url: string) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('La respuesta no es un JSON válido');
          }
          return res.json();
        };

        // Fetch users count
        const usersData = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/stats/users`);
        
        // Fetch animes count
        const animesData = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/stats/animes`);
        
        // Fetch roadmap (optional)
        let upcoming: Array<{ feature: string; eta: string }> = [];
        try {
          const roadmapData = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/roadmap`);
          upcoming = roadmapData.upcoming || [];
        } catch (e) {
          // ignore roadmap errors
        }

        setStats({
          users: usersData.count ?? 0,
          animes: animesData.count ?? 0,
          upcoming,
        });
      } catch (err) {
        console.error('Failed to fetch site stats:', err);
        setError('No se pudieron cargar las estadísticas');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Revalidate every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { stats, loading, error };
};

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { StatsChart } from '../../components/admin/StatsChart';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  Tv, 
  ShieldAlert, 
  Coins, 
  Cpu, 
  Activity, 
  FileText, 
  Mail, 
  Settings, 
  Search, 
  Clock, 
  Zap, 
  BarChart3,
  TrendingUp,
  AlertTriangle,
  UserCheck,
  ArrowLeft,
  Settings2,
  Database
} from 'lucide-react';

type Tab = 'dashboard' | 'users' | 'anime' | 'moderation' | 'finances' | 'system' | 'nexo' | 'telemetry' | 'logs' | 'emails' | 'manual';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [metrics, setMetrics] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [finances, setFinances] = useState<any>(null);
  const [animeCache, setAnimeCache] = useState<any[]>([]);
  const [nexoLogs, setNexoLogs] = useState<any[]>([]);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState(false);
  const [systemSettings, setSystemSettings] = useState<any[]>([]);
  const [sectionLoading, setSectionLoading] = useState<Record<string, boolean>>({
    analytics: true,
    stats: true,
    reports: true,
    users: true,
    finances: true,
    anime: true,
    nexo: true,
    telemetry: true,
    logs: true,
    emails: true,
    settings: true
  });
  const [investigationQuery, setInvestigationQuery] = useState('');
  const [investigationResult, setInvestigationResult] = useState<any>(null);
  const [editingAnime, setEditingAnime] = useState<any>(null);
  const [animeSearch, setAnimeSearch] = useState('');
  const [animeSearchLoading, setAnimeSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  // Moderation & User Management States
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState('RESOLVED');
  const [internalNote, setInternalNote] = useState('');

  const [selectedUserForMod, setSelectedUserForMod] = useState<any | null>(null);
  const [modActionType, setModActionType] = useState<'warn' | 'mute' | 'ban' | null>(null);
  const [modReason, setModReason] = useState('');
  const [modDuration, setModDuration] = useState('24'); // Hours for mute, Days for ban

  const [fetchErrors, setFetchErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState<string | null>(null);

  const safeFetch = useCallback(async (
    endpoint: string,
    stateSetter: (data: any) => void,
    errorKey: string
  ) => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

    setSectionLoading(prev => ({ ...prev, [errorKey]: true }));
    try {
      const res = await fetch(`${apiBase}${endpoint}`, { headers });

      if (res.status === 401 || res.status === 403) {
        const body = await res.json().catch(() => ({}));
        const errMsg = body.message || (res.status === 401
          ? 'Tu sesión ha expirado. Inicia sesión de nuevo.'
          : 'No tienes permisos para acceder a este panel.');
        setAuthError(errMsg);
        if (res.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setTimeout(() => {
            window.location.href = '/login';
          }, 3000);
        }
        return;
      }

      if (!res.ok) {
        const statusText = res.statusText || 'Error desconocido';
        if (res.status >= 500) throw new Error(`Error del servidor (${res.status}): ${statusText}`);
        if (res.status === 404) throw new Error(`Recurso no encontrado (404)`);
        if (res.status === 408) throw new Error(`Tiempo de espera agotado (408)`);
        throw new Error(`HTTP ${res.status}: ${statusText}`);
      }

      const data = await res.json();
      if (data.success) {
        stateSetter(data.data);
      } else {
        throw new Error(data.message || 'Respuesta inválida de la API');
      }
    } catch (err: any) {
      console.error(`Error fetching ${endpoint}:`, err);
      let userMsg = err.message || 'Error desconocido';
      if (err.name === 'TypeError' && err.message?.includes('fetch')) {
        userMsg = 'No se pudo conectar al servidor. Verifica tu conexión de red.';
      }
      setFetchErrors(prev => ({ ...prev, [errorKey]: userMsg }));
    } finally {
      setSectionLoading(prev => ({ ...prev, [errorKey]: false }));
    }
  }, []);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    setFetchErrors({});
    setAuthError(null);

    await Promise.allSettled([
      safeFetch('/admin/analytics', setMetrics, 'analytics'),
      safeFetch('/admin/stats', (data) => setHistoricalData(data.historical), 'stats'),
      safeFetch('/admin/reports', setReports, 'reports'),
      safeFetch('/admin/users', setUsers, 'users'),
      safeFetch('/admin/finances', setFinances, 'finances'),
      safeFetch('/admin/anime', setAnimeCache, 'anime'),
      safeFetch('/admin/nexo-logs', setNexoLogs, 'nexo'),
      safeFetch('/admin/telemetry', setTelemetry, 'telemetry'),
      safeFetch('/admin/logs', setAuditLogs, 'logs'),
      safeFetch('/admin/email-logs', setEmailLogs, 'emails'),
      safeFetch('/admin/settings', (data) => {
        setSystemSettings(data);
        const maint = data.find((s: any) => s.key === 'MAINTENANCE_MODE');
        if (maint) setMaintenance(maint.value === 'true');
      }, 'settings')
    ]);
  }, [safeFetch]);

  const retrySectionFetch = useCallback(async (key: string) => {
    setFetchErrors(prev => {
      const n = { ...prev };
      delete n[key];
      return n;
    });

    const sectionMap: Record<string, { endpoint: string; setter: (d: any) => void }> = {
      analytics: { endpoint: '/admin/analytics', setter: setMetrics },
      stats: { endpoint: '/admin/stats', setter: (d) => setHistoricalData(d.historical) },
      reports: { endpoint: '/admin/reports', setter: setReports },
      users: { endpoint: '/admin/users', setter: setUsers },
      finances: { endpoint: '/admin/finances', setter: setFinances },
      anime: { endpoint: '/admin/anime', setter: setAnimeCache },
      nexo: { endpoint: '/admin/nexo-logs', setter: setNexoLogs },
      telemetry: { endpoint: '/admin/telemetry', setter: setTelemetry },
      logs: { endpoint: '/admin/logs', setter: setAuditLogs },
      emails: { endpoint: '/admin/email-logs', setter: setEmailLogs },
      settings: { endpoint: '/admin/settings', setter: (d) => {
        setSystemSettings(d);
        const maint = d.find((s: any) => s.key === 'MAINTENANCE_MODE');
        if (maint) setMaintenance(maint.value === 'true');
      }}
    };

    const section = sectionMap[key];
    if (section) {
      await safeFetch(section.endpoint, section.setter, key);
    }
  }, [safeFetch]);

  useEffect(() => {
    fetchData();
    const style = document.createElement('style');
    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } } .spinner { animation: spin 0.8s linear infinite; }';
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [fetchData]);

  const toggleMaintenance = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/admin/maintenance`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ active: !maintenance })
      });
      const data = await res.json();
      if (data.success) {
        setMaintenance(!maintenance);
        setSystemSettings(prev => {
          const exists = prev.find(s => s.key === 'MAINTENANCE_MODE');
          if (exists) return prev.map(s => s.key === 'MAINTENANCE_MODE' ? { ...s, value: String(!maintenance) } : s);
          return [...prev, { key: 'MAINTENANCE_MODE', value: String(!maintenance) }];
        });
        alert(data.message);
      }
    } catch (e) {
      alert('Error cambiando estado de mantenimiento');
    }
  };

  const handleToggleFeatureFlag = async (key: string, currentValue: string) => {
    const newValue = currentValue === 'true' ? 'false' : 'true';
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/admin/feature-flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ key, value: newValue })
      });
      const data = await res.json();
      if (data.success) {
        setSystemSettings(prev => {
          const exists = prev.find(s => s.key === key);
          if (exists) return prev.map(s => s.key === key ? { ...s, value: newValue } : s);
          return [...prev, { key, value: newValue }];
        });
      } else {
        alert(data.message || 'Error al actualizar flag');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    }
  };

  const handleToggleUserField = async (userId: string, field: 'role' | 'verify' | 'premium') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/admin/users/${userId}/${field}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data.data } : u));
        
        // Refresh global analytics metrics
        const analyticsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/admin/analytics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const analytics = await analyticsRes.json();
        if (analytics.success) setMetrics(analytics.data);
      } else {
        alert(data.message || `Error al actualizar campo ${field}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    }
  };

  const handleResolveReport = async () => {
    if (!selectedReport) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/moderation/resolve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reportId: selectedReport.id,
          status: resolutionStatus,
          internalNote
        })
      });
      const data = await res.json();
      if (data.success) {
        setReports(prev => prev.map(r => r.id === selectedReport.id ? { ...r, status: resolutionStatus } : r));
        setSelectedReport(null);
        setInternalNote('');
        alert('Reporte actualizado.');
      } else {
        alert(data.message || 'Error al resolver el reporte');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    }
  };

  const handleUserModAction = async () => {
    if (!selectedUserForMod) return;
    try {
      const token = localStorage.getItem('token');
      let endpoint = '';
      const body: any = {
        userId: selectedUserForMod.id,
        reason: modReason
      };

      if (modActionType === 'warn') {
        endpoint = '/moderation/warning';
      } else if (modActionType === 'mute') {
        endpoint = '/moderation/mute';
        body.hours = Number(modDuration);
      } else if (modActionType === 'ban') {
        endpoint = '/moderation/ban';
        body.days = Number(modDuration);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        alert(`Acción ${modActionType?.toUpperCase()} aplicada con éxito a ${selectedUserForMod.username}`);
        setSelectedUserForMod(null);
        setModActionType(null);
        setModReason('');
      } else {
        alert(data.message || 'Error al aplicar moderación');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    }
  };

  const handleInvestigate = async () => {
    if (!investigationQuery) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/moderation/investigate/${investigationQuery.replace('@', '')}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setInvestigationResult(data.data);
      } else {
        alert(data.message || 'Usuario no encontrado.');
        setInvestigationResult(null);
      }
    } catch (e) {
      console.error(e);
      alert('Error al investigar usuario.');
    }
  };

  const handleUpdateAnime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnime) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/admin/anime/${editingAnime.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          titleRomaji: editingAnime.titleRomaji,
          description: editingAnime.description,
          status: editingAnime.status,
          episodes: editingAnime.episodes,
          coverImage: editingAnime.coverImage
        })
      });
      const data = await res.json();
      if (data.success) {
        setAnimeCache(prev => prev.map(a => a.id === editingAnime.id ? data.data : a));
        setEditingAnime(null);
        alert('Anime actualizado exitosamente.');
      } else {
        alert(data.message || 'Error al actualizar anime.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    }
  };

  const isInitialLoad = Object.values(sectionLoading).every(v => v === true);
  if (isInitialLoad) return <div style={{ padding: '40px', color: '#00E5FF', backgroundColor: '#050505', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>Iniciando Consola Enterprise...</div>;

  if (authError) {
    return (
      <div style={{ padding: '40px', color: '#FF5252', backgroundColor: '#050505', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', gap: '20px' }}>
        <div style={{ fontSize: '1.5rem' }}>⚠️ {authError}</div>
        <p style={{ color: '#888', fontWeight: 'normal' }}>Redirigiendo a la página de inicio de sesión...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {sectionLoading.analytics ? (
              <SectionLoader label="métricas generales" />
            ) : fetchErrors.analytics ? (
              <SectionError
                errorKey="analytics"
                message={fetchErrors.analytics}
                onRetry={() => retrySectionFetch('analytics')}
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                <MetricCard 
                  icon={<Users size={20} color="#00E5FF" />}
                  label="Usuarios Registrados" 
                  value={metrics?.metrics.userCount ?? 0} 
                  sub="Total registrados en DB" 
                  color="#00E5FF" 
                />
                <MetricCard 
                  icon={<UserCheck size={20} color="#22C55E" />}
                  label="Usuarios Verificados" 
                  value={metrics?.metrics.verifiedUsers ?? 0} 
                  sub={metrics?.metrics.userCount > 0 ? `${((metrics.metrics.verifiedUsers / metrics.metrics.userCount) * 100).toFixed(1)}% del total` : '0% del total'} 
                  color="#22C55E" 
                />
                <MetricCard 
                  icon={<Zap size={20} color="#FFD700" />}
                  label="Conversión Premium" 
                  value={metrics?.metrics.premiumUsers ?? 0} 
                  sub={metrics?.metrics.userCount > 0 ? `${((metrics.metrics.premiumUsers / metrics.metrics.userCount) * 100).toFixed(1)}% del total` : '0% del total'} 
                  color="#FFD700" 
                />
                <MetricCard 
                  icon={<Cpu size={20} color="#A855F7" />}
                  label="Interacciones Nexo" 
                  value={metrics?.metrics.nexoInteractionsCount ?? 0} 
                  sub="Menciones e IA" 
                  color="#A855F7" 
                />
                <MetricCard 
                  icon={<Activity size={20} color="#FF5252" />}
                  label="Salud del Sistema" 
                  value="99.9%" 
                  sub="Uptime 30d" 
                  color="#FF5252" 
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
              <Card style={{ padding: '25px' }}>
                {sectionLoading.stats ? (
                  <SectionLoader label="gráfico de actividad" />
                ) : fetchErrors.stats ? (
                  <SectionError
                    errorKey="stats"
                    message={fetchErrors.stats}
                    onRetry={() => retrySectionFetch('stats')}
                  />
                ) : (
                  <StatsChart title="Actividad de Nuevos Usuarios" data={historicalData} dataKey="newUsers" color="#00E5FF" />
                )}
              </Card>
              <Card style={{ padding: '25px' }}>
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={20} color="#A855F7" />
                  Alertas de Nexo
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <SuggestionItem text="Detectado pico de menciones en 'Solo Leveling'. Considerar evento premium." type="info" />
                  <SuggestionItem text="Alta tasa de reportes en el post de @TrollBot. Recomendado ban preventivo." type="warning" />
                  <SuggestionItem text="Nuevos usuarios de LATAM aumentando. Sugerencia: Localizar Nexo al Español." type="idea" />
                </div>
                
                <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Actividad Reciente</h3>
                {sectionLoading.analytics ? (
                  <SectionLoader label="actividad reciente" />
                ) : fetchErrors.analytics ? (
                  <div style={{ fontSize: '0.85rem', color: '#FF5252' }}>No se pudo cargar la actividad reciente.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {metrics?.recentUsers.map((u: any, i: number) => (
                      <div key={i} style={{ fontSize: '0.85rem', borderLeft: '3px solid var(--color-primary)', paddingLeft: '12px', color: '#ccc' }}>
                        <strong>@{u.username}</strong> se unió como <span style={{ color: 'gold' }}>{u.role}</span>
                        <span style={{ display: 'block', color: '#555', fontSize: '0.75rem' }}>{new Date(u.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        );
      
      case 'users':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {sectionLoading.users ? (
              <SectionLoader label="usuarios" />
            ) : fetchErrors.users ? (
              <SectionError
                errorKey="users"
                message={fetchErrors.users}
                onRetry={() => retrySectionFetch('users')}
              />
            ) : (
              <>
                <Card style={{ padding: '25px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, color: '#fff' }}>Gestión de Usuarios</h2>
                    <span style={{ fontSize: '0.9rem', color: '#555' }}>Mostrando {users.length} usuarios recientes</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid #222', color: '#555' }}>
                        <th style={{ padding: '15px' }}>Usuario</th>
                        <th style={{ padding: '15px' }}>Email</th>
                        <th style={{ padding: '15px' }}>Rol</th>
                        <th style={{ padding: '15px' }}>Verificado</th>
                        <th style={{ padding: '15px' }}>Premium</th>
                        <th style={{ padding: '15px' }}>Fecha Registro</th>
                        <th style={{ padding: '15px' }}>Acciones rápidas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u: any) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid #1a1a1c', color: '#ccc' }}>
                          <td style={{ padding: '15px', fontWeight: 600, color: '#fff' }}>{u.username}</td>
                          <td style={{ padding: '15px' }}>{u.email}</td>
                          <td style={{ padding: '15px' }}>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '0.75rem', 
                              fontWeight: 700,
                              background: u.role === 'ADMIN' || u.role === 'SUPERADMIN' ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                              color: u.role === 'ADMIN' || u.role === 'SUPERADMIN' ? '#00E5FF' : '#888'
                            }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: '15px' }}>
                            <span style={{ 
                              color: u.isVerified ? '#22C55E' : '#FF5252',
                              fontWeight: 600
                            }}>
                              {u.isVerified ? '✓ Sí' : '✗ No'}
                            </span>
                          </td>
                          <td style={{ padding: '15px' }}>
                            <span style={{ 
                              color: u.isPremium ? '#FFD700' : '#888',
                              fontWeight: 600
                            }}>
                              {u.isPremium ? '★ Premium' : 'Free'}
                            </span>
                          </td>
                          <td style={{ padding: '15px' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: '15px' }}>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: '#22C55E', color: '#22C55E' }}
                                onClick={() => handleToggleUserField(u.id, 'verify')}
                              >
                                {u.isVerified ? 'Quitar Verif.' : 'Verificar'}
                              </Button>
                              
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: '#FFD700', color: '#FFD700' }}
                                onClick={() => handleToggleUserField(u.id, 'premium')}
                              >
                                {u.isPremium ? 'Quitar Prem.' : 'Dar Premium'}
                              </Button>

                              <Button 
                                variant="secondary" 
                                size="sm" 
                                style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: '#00E5FF', color: '#00E5FF' }}
                                onClick={() => handleToggleUserField(u.id, 'role')}
                              >
                                {u.role === 'ADMIN' ? 'Hacer Usuario' : 'Hacer Admin'}
                              </Button>

                              <Button 
                                variant="primary" 
                                size="sm" 
                                style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#FF5252', color: '#fff', border: 'none' }}
                                onClick={() => {
                                  setSelectedUserForMod(u);
                                  setModActionType('warn');
                                  setModReason('');
                                  setModDuration('24');
                                }}
                              >
                                Moderar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>

                {selectedUserForMod && (
                  <Card style={{ padding: '25px', border: '1px solid #FF5252' }}>
                    <h3 style={{ color: '#FF5252', marginBottom: '20px' }}>Sancionar a @{selectedUserForMod.username}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '600px' }}>
                      <div>
                        <label style={{ color: '#888', display: 'block', marginBottom: '5px' }}>Tipo de Sanción</label>
                        <div style={{ display: 'flex', gap: '15px' }}>
                          <label style={{ color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <input 
                              type="radio" 
                              name="modActionType" 
                              checked={modActionType === 'warn'} 
                              onChange={() => setModActionType('warn')} 
                            /> Advertencia
                          </label>
                          <label style={{ color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <input 
                              type="radio" 
                              name="modActionType" 
                              checked={modActionType === 'mute'} 
                              onChange={() => setModActionType('mute')} 
                            /> Silenciar (Mute)
                          </label>
                          <label style={{ color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <input 
                              type="radio" 
                              name="modActionType" 
                              checked={modActionType === 'ban'} 
                              onChange={() => setModActionType('ban')} 
                            /> Banear (Ban)
                          </label>
                        </div>
                      </div>

                      {modActionType === 'mute' && (
                        <div>
                          <label style={{ color: '#888', display: 'block', marginBottom: '5px' }}>Duración del Silencio (Horas)</label>
                          <input 
                            type="number" 
                            value={modDuration} 
                            onChange={(e) => setModDuration(e.target.value)}
                            style={{ background: '#111', border: '1px solid #333', padding: '10px', color: '#fff', borderRadius: '8px', width: '100%' }}
                          />
                        </div>
                      )}

                      {modActionType === 'ban' && (
                        <div>
                          <label style={{ color: '#888', display: 'block', marginBottom: '5px' }}>Duración de la Suspensión (Días - vacío para permanente)</label>
                          <input 
                            type="number" 
                            placeholder="Ej: 7"
                            value={modDuration === '24' ? '' : modDuration} 
                            onChange={(e) => setModDuration(e.target.value)}
                            style={{ background: '#111', border: '1px solid #333', padding: '10px', color: '#fff', borderRadius: '8px', width: '100%' }}
                          />
                        </div>
                      )}

                      <div>
                        <label style={{ color: '#888', display: 'block', marginBottom: '5px' }}>Razón Disciplinaria</label>
                        <textarea 
                          placeholder="Escribe la justificación de esta sanción (se registrará internamente y se le notificará al usuario)..."
                          value={modReason}
                          onChange={(e) => setModReason(e.target.value)}
                          style={{ background: '#111', border: '1px solid #333', padding: '10px', color: '#fff', borderRadius: '8px', width: '100%', minHeight: '80px', fontFamily: 'inherit' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <Button variant="primary" style={{ background: '#FF5252', border: 'none' }} onClick={handleUserModAction}>Aplicar Sanción</Button>
                        <Button variant="ghost" onClick={() => setSelectedUserForMod(null)}>Cancelar</Button>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        );

      case 'anime':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {sectionLoading.anime ? (
              <SectionLoader label="catálogo de anime" />
            ) : fetchErrors.anime ? (
              <SectionError
                errorKey="anime"
                message={fetchErrors.anime}
                onRetry={() => retrySectionFetch('anime')}
              />
            ) : (
              <>
                <Card style={{ padding: '25px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, color: '#fff' }}>Base de Datos de Anime</h2>
                    <span style={{ color: '#555', fontSize: '0.85rem' }}>{animeCache.length} resultados</span>
                  </div>

                  <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#555', fontSize: '1rem' }}>🔍</span>
                    <Input
                      placeholder="Buscar anime por título (Romaji, Inglés o Japonés)..."
                      value={animeSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAnimeSearch(val);
                        setAnimeSearchLoading(true);
                        if (searchTimeoutRef.current) {
                          clearTimeout(searchTimeoutRef.current);
                        }
                        const token = localStorage.getItem('token');
                        searchTimeoutRef.current = setTimeout(async () => {
                          try {
                            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/admin/anime${val ? `?q=${encodeURIComponent(val)}` : ''}`, {
                              headers: { 'Authorization': `Bearer ${token}` }
                            });
                            const data = await res.json();
                            if (data.success) setAnimeCache(data.data);
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setAnimeSearchLoading(false);
                          }
                        }, 400);
                      }}
                      style={{ width: '100%', paddingLeft: '2.5rem' }}
                    />
                    {animeSearchLoading && (
                      <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-primary)', fontSize: '0.8rem' }}>Buscando...</span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                    {animeCache.length === 0 ? (
                      <p style={{ color: '#555', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>No se encontraron animes{animeSearch ? ` para "${animeSearch}"` : ''}.</p>
                    ) : animeCache.map((a, i) => (
                      <div key={a.id || i} style={{ padding: '1rem', backgroundColor: '#1a1a1a', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
                        <img src={a.coverImage || 'https://via.placeholder.com/200x300?text=No+Image'} alt={a.titleRomaji || 'Anime'} style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', height: '240px' }} />
                        <h4 style={{ margin: '0.5rem 0', fontSize: '0.85rem', flex: 1, lineHeight: 1.3, color: '#fff' }}>{a.titleRomaji || 'Unknown'}</h4>
                        {a.status && <span style={{ fontSize: '0.75rem', color: a.status === 'RELEASING' ? 'lime' : '#888', marginBottom: '0.5rem' }}>{a.status}</span>}
                        <Button size="sm" style={{ width: '100%' }} onClick={() => setEditingAnime(a)}>Editar Ficha</Button>
                      </div>
                    ))}
                  </div>

                  {editingAnime && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                      <div style={{ backgroundColor: '#111', padding: '2rem', borderRadius: '12px', width: '500px', maxWidth: '90%' }}>
                        <h3 style={{ marginTop: 0, color: '#fff' }}>Editar Anime: {editingAnime.titleRomaji}</h3>
                        <form onSubmit={handleUpdateAnime} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Título (Romaji)</label>
                            <Input 
                              value={editingAnime.titleRomaji || ''} 
                              onChange={(e) => setEditingAnime({...editingAnime, titleRomaji: e.target.value})} 
                              style={{ width: '100%' }} 
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Descripción</label>
                            <textarea 
                              value={editingAnime.description || ''} 
                              onChange={(e) => setEditingAnime({...editingAnime, description: e.target.value})} 
                              style={{ width: '100%', minHeight: '100px', backgroundColor: 'transparent', border: '1px solid #333', color: '#fff', padding: '0.8rem', borderRadius: '8px' }} 
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Estado</label>
                              <Input 
                                value={editingAnime.status || ''} 
                                onChange={(e) => setEditingAnime({...editingAnime, status: e.target.value})} 
                                style={{ width: '100%' }} 
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Episodios</label>
                              <Input 
                                type="number"
                                value={editingAnime.episodes || ''} 
                                onChange={(e) => setEditingAnime({...editingAnime, episodes: e.target.value})} 
                                style={{ width: '100%' }} 
                              />
                            </div>
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>URL de Portada</label>
                            <Input 
                              value={editingAnime.coverImage || ''} 
                              onChange={(e) => setEditingAnime({...editingAnime, coverImage: e.target.value})} 
                              style={{ width: '100%' }} 
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <Button variant="ghost" type="button" onClick={() => setEditingAnime(null)}>Cancelar</Button>
                            <Button variant="primary" type="submit">Guardar Cambios</Button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        );

      case 'moderation':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {sectionLoading.reports ? (
              <SectionLoader label="cola de moderación" />
            ) : fetchErrors.reports ? (
              <SectionError
                errorKey="reports"
                message={fetchErrors.reports}
                onRetry={() => retrySectionFetch('reports')}
              />
            ) : (
              <>
                <Card style={{ padding: '25px' }}>
                  <h2 style={{ marginBottom: '20px', color: '#fff' }}>Cola de Moderación</h2>
                  {reports.length === 0 ? (
                    <p style={{ color: '#555' }}>No hay reportes pendientes.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #222', color: '#555' }}>
                          <th style={{ padding: '15px' }}>Reportado</th>
                          <th style={{ padding: '15px' }}>Razón</th>
                          <th style={{ padding: '15px' }}>Fecha</th>
                          <th style={{ padding: '15px' }}>Estado</th>
                          <th style={{ padding: '15px' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((r: any) => (
                          <tr key={r.id} style={{ borderBottom: '1px solid #1a1a1c', color: '#ccc' }}>
                            <td style={{ padding: '15px', fontWeight: 600, color: '#fff' }}>{r.reportedUser?.username || 'Usuario Desconocido'}</td>
                            <td style={{ padding: '15px' }}>{r.reason}</td>
                            <td style={{ padding: '15px' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                            <td style={{ padding: '15px' }}>
                              <span style={{ 
                                fontSize: '0.75rem', 
                                padding: '0.2rem 0.5rem', 
                                borderRadius: '4px', 
                                backgroundColor: r.status === 'PENDING' ? 'rgba(255,165,0,0.1)' : 'rgba(0,255,0,0.1)', 
                                color: r.status === 'PENDING' ? 'orange' : 'lime' 
                              }}>
                                {r.status}
                              </span>
                            </td>
                            <td style={{ padding: '15px' }}>
                              <Button variant="secondary" size="sm" onClick={() => {
                                setSelectedReport(r);
                                setResolutionStatus('RESOLVED');
                                setInternalNote('');
                              }}>
                                Resolver
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Card>

                {selectedReport && (
                  <Card style={{ padding: '25px', border: '1px solid #00E5FF' }}>
                    <h3 style={{ color: '#00E5FF', marginBottom: '20px' }}>Resolviendo Reporte de @{selectedReport.reportedUser?.username}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '600px' }}>
                      <div>
                        <span style={{ color: '#555', fontSize: '0.8rem', display: 'block' }}>Razón del reporte</span>
                        <strong style={{ color: '#fff' }}>{selectedReport.reason}</strong>
                      </div>

                      <div>
                        <label style={{ color: '#888', display: 'block', marginBottom: '5px' }}>Acción de Resolución</label>
                        <select 
                          value={resolutionStatus} 
                          onChange={(e) => setResolutionStatus(e.target.value)}
                          style={{ background: '#111', border: '1px solid #333', padding: '10px', color: '#fff', borderRadius: '8px', width: '100%' }}
                        >
                          <option value="RESOLVED">Marcar como Resuelto (Acción Tomada)</option>
                          <option value="DISMISSED">Ignorar Reporte (Sin Acción)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ color: '#888', display: 'block', marginBottom: '5px' }}>Nota Interna (Mod/Admin)</label>
                        <textarea 
                          placeholder="Escribe la justificación interna de esta resolución..."
                          value={internalNote}
                          onChange={(e) => setInternalNote(e.target.value)}
                          style={{ background: '#111', border: '1px solid #333', padding: '10px', color: '#fff', borderRadius: '8px', width: '100%', minHeight: '80px', fontFamily: 'inherit' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <Button variant="primary" onClick={handleResolveReport}>Guardar Resolución</Button>
                        <Button variant="ghost" onClick={() => setSelectedReport(null)}>Cancelar</Button>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}

            <Card style={{ padding: '25px' }}>
              <h2 style={{ marginTop: 0, color: '#fff' }}>Investigación de Usuario</h2>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <Input 
                  placeholder="Buscar @username para ver historial de sanciones..." 
                  style={{ flex: 1 }} 
                  value={investigationQuery}
                  onChange={(e) => setInvestigationQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvestigate()}
                />
                <Button variant="primary" onClick={handleInvestigate}>Ver Auditoría</Button>
              </div>

              {investigationResult && (
                <div style={{ padding: '1rem', backgroundColor: '#111', borderRadius: '8px' }}>
                  <h3 style={{ marginTop: 0, color: 'var(--color-primary)' }}>Resultados para @{investigationResult.username}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <h4 style={{ color: 'red' }}>Bans ({investigationResult.bans.length})</h4>
                      <ul style={{ paddingLeft: '1rem', color: '#888', fontSize: '0.9rem' }}>
                        {investigationResult.bans.map((b: any, i: number) => <li key={i}>{b.reason}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ color: 'orange' }}>Mutes ({investigationResult.mutes.length})</h4>
                      <ul style={{ paddingLeft: '1rem', color: '#888', fontSize: '0.9rem' }}>
                        {investigationResult.mutes.map((m: any, i: number) => <li key={i}>{m.reason}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ color: 'cyan' }}>Advertencias ({investigationResult.warnings.length})</h4>
                      <ul style={{ paddingLeft: '1rem', color: '#888', fontSize: '0.9rem' }}>
                        {investigationResult.warnings.map((w: any, i: number) => <li key={i}>{w.reason}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ color: '#ccc' }}>Reportes Recibidos ({investigationResult.reportsReceived.length})</h4>
                      <ul style={{ paddingLeft: '1rem', color: '#888', fontSize: '0.9rem' }}>
                        {investigationResult.reportsReceived.map((r: any, i: number) => <li key={i}>{r.reason} ({r.status})</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        );

      case 'logs':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {sectionLoading.logs ? (
              <SectionLoader label="logs de auditoría" />
            ) : fetchErrors.logs ? (
              <SectionError
                errorKey="logs"
                message={fetchErrors.logs}
                onRetry={() => retrySectionFetch('logs')}
              />
            ) : (
              <Card style={{ padding: '25px' }}>
                <h2 style={{ marginTop: 0, color: '#fff' }}>Logs de Auditoría</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textDecoration: 'none', color: '#555', borderBottom: '1px solid #333' }}>
                      <th style={{ padding: '1rem' }}>Moderador</th>
                      <th style={{ padding: '1rem' }}>Acción</th>
                      <th style={{ padding: '1rem' }}>Objetivo</th>
                      <th style={{ padding: '1rem' }}>Razón</th>
                      <th style={{ padding: '1rem' }}>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #222', color: '#ccc' }}>
                        <td style={{ padding: '1rem' }}>@{log.moderator.username}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            fontWeight: 'bold',
                            color: log.action === 'BAN' ? 'red' : (log.action === 'MUTE' ? 'orange' : 'cyan')
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>@{log.targetUser.username}</td>
                        <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{log.reason}</td>
                        <td style={{ padding: '1rem', color: '#555' }}>{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        );

      case 'emails':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {sectionLoading.emails ? (
              <SectionLoader label="cola de correos" />
            ) : fetchErrors.emails ? (
              <SectionError
                errorKey="emails"
                message={fetchErrors.emails}
                onRetry={() => retrySectionFetch('emails')}
              />
            ) : (
              <Card style={{ padding: '25px' }}>
                <h2 style={{ marginTop: 0, color: '#fff' }}>Cola de Correos Enterprise</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#555', borderBottom: '1px solid #333' }}>
                      <th style={{ padding: '1rem' }}>Destinatario</th>
                      <th style={{ padding: '1rem' }}>Asunto</th>
                      <th style={{ padding: '1rem' }}>Estado</th>
                      <th style={{ padding: '1rem' }}>Intentos</th>
                      <th style={{ padding: '1rem' }}>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailLogs.map((l, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #222', color: '#ccc' }}>
                        <td style={{ padding: '1rem' }}>{l.to}</td>
                        <td style={{ padding: '1rem' }}>{l.subject}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '4px', 
                            fontSize: '0.7rem',
                            backgroundColor: l.status === 'SENT' ? 'rgba(0,255,0,0.1)' : l.status === 'FAILED' ? 'rgba(255,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                            color: l.status === 'SENT' ? 'lime' : l.status === 'FAILED' ? 'red' : 'white'
                          }}>
                            {l.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>{l.attempts}</td>
                        <td style={{ padding: '1rem' }}>{new Date(l.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        );

      case 'finances':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {sectionLoading.finances ? (
              <SectionLoader label="finanzas" />
            ) : fetchErrors.finances ? (
              <SectionError
                errorKey="finances"
                message={fetchErrors.finances}
                onRetry={() => retrySectionFetch('finances')}
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <Card style={{ padding: '25px' }}>
                  <h2 style={{ marginTop: 0, color: '#fff' }}>Donaciones Recientes</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {finances?.donations.map((d: any, i: number) => (
                      <div key={i} style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderBottom: '1px solid #222' }}>
                        <strong>{d.user ? `@${d.user.username}` : 'Anónimo'}</strong> donó <span style={{ color: 'lime', fontWeight: 'bold' }}>${d.amount}</span>
                        <p style={{ margin: '0.5rem 0', color: '#888', fontSize: '0.9rem' }}>"{d.message}"</p>
                        <small style={{ color: '#444' }}>{new Date(d.createdAt).toLocaleDateString()}</small>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card style={{ padding: '25px' }}>
                  <h2 style={{ marginTop: 0, color: '#fff' }}>Anuncios Activos</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {finances?.ads.map((ad: any, i: number) => (
                      <div key={i} style={{ padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: '#fff' }}>{ad.title}</strong>
                          <span style={{ 
                            padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                            background: ad.active ? 'rgba(34,197,94,0.15)' : 'rgba(255,82,82,0.15)',
                            color: ad.active ? '#22C55E' : '#FF5252'
                          }}>
                            {ad.active ? 'Activo' : 'Pausado'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '10px' }}>
                          Clicks: {ad.clicks} | Impresiones: {ad.impressions}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>
        );

      case 'nexo':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {sectionLoading.nexo ? (
              <SectionLoader label="telemetría Nexo IA" />
            ) : fetchErrors.nexo ? (
              <SectionError
                errorKey="nexo"
                message={fetchErrors.nexo}
                onRetry={() => retrySectionFetch('nexo')}
              />
            ) : (
              <Card style={{ padding: '25px' }}>
                <h2 style={{ marginTop: 0, color: '#fff' }}>Telemetría Nexo (IA)</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ padding: '15px', backgroundColor: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '8px' }}>
                    <h4 style={{ margin: 0, color: '#00E5FF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Cpu size={18} />
                      Sugerencia de Nexo
                    </h4>
                    <p style={{ margin: '10px 0 0 0', color: '#ccc', fontSize: '0.9rem', lineHeight: 1.5 }}>He detectado un aumento del 15% en mensajes negativos en el feed de "Chainsaw Man". Sugiero activar el filtro de moderación estricto para este tema.</p>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#555', borderBottom: '1px solid #222' }}>
                        <th style={{ padding: '15px' }}>Usuario</th>
                        <th style={{ padding: '15px' }}>Input</th>
                        <th style={{ padding: '15px' }}>Tokens</th>
                        <th style={{ padding: '15px' }}>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nexoLogs.map((log, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #1a1a1c', color: '#ccc' }}>
                          <td style={{ padding: '15px' }}>@{log.user.username}</td>
                          <td style={{ padding: '15px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.input}</td>
                          <td style={{ padding: '15px' }}>{log.tokensUsed}</td>
                          <td style={{ padding: '15px' }}>{new Date(log.createdAt).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        );

      case 'telemetry':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {sectionLoading.telemetry ? (
              <SectionLoader label="telemetría de rendimiento" />
            ) : fetchErrors.telemetry ? (
              <SectionError
                errorKey="telemetry"
                message={fetchErrors.telemetry}
                onRetry={() => retrySectionFetch('telemetry')}
              />
            ) : (
              <>
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                  <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(0, 229, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={24} color="#00E5FF" />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#555', display: 'block', fontWeight: 600 }}>Sesiones Totales</span>
                      <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>{telemetry?.totalSessions ?? 0}</span>
                    </div>
                  </Card>
                  <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={24} color="#A855F7" />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#555', display: 'block', fontWeight: 600 }}>Duración Promedio</span>
                      <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>{telemetry?.avgSessionTime ? `${(telemetry.avgSessionTime / 60).toFixed(1)}m` : '0m'}</span>
                    </div>
                  </Card>
                  <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Search size={24} color="#22C55E" />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#555', display: 'block', fontWeight: 600 }}>Búsquedas Registradas</span>
                      <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>{telemetry?.topSearches?.reduce((acc: number, s: any) => acc + s._count.query, 0) ?? 0}</span>
                    </div>
                  </Card>
                  <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(255, 215, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BarChart3 size={24} color="#FFD700" />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#555', display: 'block', fontWeight: 600 }}>Ads Activos</span>
                      <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>{telemetry?.adPerformance?.length ?? 0}</span>
                    </div>
                  </Card>
                </div>

                {/* Two-column layout */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                  {/* Top Searches */}
                  <Card style={{ padding: '25px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <Search size={20} color="#00E5FF" />
                      <h3 style={{ margin: 0, color: '#fff' }}>Top Búsquedas</h3>
                    </div>
                    {(!telemetry?.topSearches || telemetry.topSearches.length === 0) ? (
                      <p style={{ color: '#555', textAlign: 'center', padding: '30px 0' }}>Sin datos de búsqueda aún.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {telemetry.topSearches.map((s: any, i: number) => {
                          const maxCount = telemetry.topSearches[0]._count.query;
                          const barPercent = maxCount > 0 ? (s._count.query / maxCount) * 100 : 0;
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ color: '#555', fontSize: '0.75rem', width: '24px', textAlign: 'right', fontWeight: 700 }}>#{i + 1}</span>
                              <div style={{ flex: 1, position: 'relative', height: '36px', borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.03)' }}>
                                <div style={{ 
                                  position: 'absolute', top: 0, left: 0, height: '100%', 
                                  width: `${barPercent}%`, 
                                  background: `linear-gradient(90deg, rgba(0,229,255,0.15), rgba(0,229,255,0.05))`,
                                  borderRadius: '8px',
                                  transition: 'width 0.5s ease'
                                }} />
                                <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px' }}>
                                  <span style={{ color: '#eee', fontSize: '0.85rem', fontWeight: 500 }}>{s.query}</span>
                                  <span style={{ color: '#00E5FF', fontSize: '0.8rem', fontWeight: 700 }}>{s._count.query}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>

                  {/* Ad Performance */}
                  <Card style={{ padding: '25px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <BarChart3 size={20} color="#FFD700" />
                      <h3 style={{ margin: 0, color: '#fff' }}>Rendimiento de Ads</h3>
                    </div>
                    {(!telemetry?.adPerformance || telemetry.adPerformance.length === 0) ? (
                      <p style={{ color: '#555', textAlign: 'center', padding: '30px 0' }}>No hay anuncios registrados.</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', borderBottom: '1px solid #222', color: '#555', fontSize: '0.75rem' }}>
                            <th style={{ padding: '10px' }}>Título</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Impresiones</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Clicks</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>CTR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {telemetry.adPerformance.map((ad: any, i: number) => (
                            <tr key={i} style={{ borderBottom: '1px solid #1a1a1c' }}>
                              <td style={{ padding: '12px 10px', color: '#eee', fontWeight: 500, fontSize: '0.85rem' }}>{ad.title}</td>
                              <td style={{ padding: '12px 10px', color: '#aaa', textAlign: 'center', fontSize: '0.85rem' }}>{ad.impressions.toLocaleString()}</td>
                              <td style={{ padding: '12px 10px', color: '#aaa', textAlign: 'center', fontSize: '0.85rem' }}>{ad.clicks.toLocaleString()}</td>
                              <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                <span style={{ 
                                  padding: '3px 10px', 
                                  borderRadius: '12px', 
                                  fontSize: '0.75rem', 
                                  fontWeight: 700,
                                  background: ad.ctr > 2 ? 'rgba(34,197,94,0.15)' : ad.ctr > 0.5 ? 'rgba(255,215,0,0.15)' : 'rgba(255,82,82,0.15)',
                                  color: ad.ctr > 2 ? '#22C55E' : ad.ctr > 0.5 ? '#FFD700' : '#FF5252'
                                }}>
                                  {ad.ctr.toFixed(2)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </Card>
                </div>

                {/* Recent Events Timeline */}
                <Card style={{ padding: '25px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <Activity size={20} color="#A855F7" />
                    <h3 style={{ margin: 0, color: '#fff' }}>Eventos Recientes</h3>
                  </div>
                  {(!telemetry?.recentEvents || telemetry.recentEvents.length === 0) ? (
                    <p style={{ color: '#555', textAlign: 'center', padding: '30px 0' }}>No hay eventos registrados aún.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                      {telemetry.recentEvents.map((ev: any, i: number) => {
                        const eventColors: Record<string, string> = {
                          'PAGE_VIEW': '#00E5FF',
                          'CLICK': '#22C55E',
                          'SEARCH': '#FFD700',
                          'ERROR': '#FF5252',
                          'LOGIN': '#A855F7',
                          'SIGNUP': '#FF79C6'
                        };
                        const color = eventColors[ev.type] || eventColors[ev.eventType] || '#888';
                        return (
                          <div key={ev.id || i} style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', padding: '12px 0', borderBottom: i < telemetry.recentEvents.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '12px' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}40`, marginTop: '4px' }} />
                              {i < telemetry.recentEvents.length - 1 && <div style={{ width: '2px', flex: 1, background: 'rgba(255,255,255,0.06)', marginTop: '4px', minHeight: '20px' }} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ 
                                  padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                                  background: `${color}15`, color: color
                                }}>
                                  {ev.type || ev.eventType}
                                </span>
                                <span style={{ color: '#555', fontSize: '0.75rem' }}>{ev.user?.username || 'Anónimo'}</span>
                              </div>
                              <p style={{ margin: 0, color: '#aaa', fontSize: '0.8rem' }}>{ev.payload || (ev.metadata ? (typeof ev.metadata === 'string' ? ev.metadata : JSON.stringify(ev.metadata)) : 'Sin detalles')}</p>
                            </div>
                            <span style={{ color: '#444', fontSize: '0.7rem', whiteSpace: 'nowrap', marginTop: '4px' }}>
                              {new Date(ev.createdAt).toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        );

      case 'system':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {sectionLoading.settings ? (
              <SectionLoader label="configuraciones de sistema" />
            ) : fetchErrors.settings ? (
              <SectionError
                errorKey="settings"
                message={fetchErrors.settings}
                onRetry={() => retrySectionFetch('settings')}
              />
            ) : (
              <Card style={{ padding: '25px' }}>
                <h2 style={{ marginTop: 0, color: '#fff' }}>Configuraciones de Sistema</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div>
                    <h3 style={{ color: '#eee', marginBottom: '15px' }}>Estado Global</h3>
                    <Button 
                      style={{ backgroundColor: maintenance ? '#FF5252' : '#22C55E', color: 'white', border: 'none' }}
                      onClick={toggleMaintenance}
                    >
                      {maintenance ? 'Desactivar Modo Mantenimiento' : 'Activar Modo Mantenimiento'}
                    </Button>
                  </div>
                  <div>
                    <h3 style={{ color: '#eee', marginBottom: '15px' }}>Feature Flags</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {systemSettings.filter((s: any) => s.key !== 'MAINTENANCE_MODE').map((s: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
                          <span style={{ color: '#eee', fontWeight: 500 }}>{s.key}</span>
                          <Button 
                            size="sm" 
                            variant={s.value === 'true' ? 'primary' : 'ghost'} 
                            style={s.value !== 'true' ? { border: '1px solid #333', color: '#888' } : undefined}
                            onClick={() => handleToggleFeatureFlag(s.key, s.value)}
                          >
                            {s.value === 'true' ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <Input id="newFlagKey" placeholder="Nueva Flag (EJ: REGISTRO_PUBLICO)" style={{ flex: 1 }} />
                        <Button onClick={() => {
                          const input = document.getElementById('newFlagKey') as HTMLInputElement;
                          if (input.value) {
                            handleToggleFeatureFlag(input.value.toUpperCase(), 'false');
                            input.value = '';
                          }
                        }}>Añadir</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        );
      case 'manual':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', color: '#ccc', fontSize: '0.95rem', lineHeight: '1.6' }}>
            <Card style={{ padding: '30px', border: '1px solid rgba(0, 229, 255, 0.15)' }}>
              <h2 style={{ marginTop: 0, color: '#00E5FF', fontWeight: 800 }}>📖 Guía del Administrador AniNexo</h2>
              <p style={{ color: '#888', marginBottom: '25px' }}>Este manual proporciona un resumen de las herramientas administrativas y los flujos disponibles en la consola de AniNexo Enterprise.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <section>
                  <h3 style={{ color: '#fff', borderBottom: '1px solid #222', paddingBottom: '8px', margin: '0 0 12px 0' }}>👤 Gestión de Usuarios</h3>
                  <p>Permite administrar el estado y privilegios de las cuentas de usuario registradas:</p>
                  <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                    <li><strong>Verificar Cuenta:</strong> Otorga o revoca el estado verificado (marca de verificación verde).</li>
                    <li><strong>Otorgar Premium:</strong> Asigna o revoca suscripción Premium de forma manual.</li>
                    <li><strong>Cambiar Rol:</strong> Eleva o reduce el rol a administradores para auditoría y soporte.</li>
                  </ul>
                </section>

                <section>
                  <h3 style={{ color: '#fff', borderBottom: '1px solid #222', paddingBottom: '8px', margin: '0 0 12px 0' }}>🛡️ Moderación e Infracciones</h3>
                  <p>Manejo de denuncias por publicaciones inapropiadas o cuentas problemáticas:</p>
                  <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                    <li><strong>Reportes Pendientes:</strong> Permite resolver denuncias justificadas o ignorarlas.</li>
                    <li><strong>Sanciones directas:</strong> Enviar advertencias escritas, silenciar (Mute) temporalmente o Banear cuentas permanentemente.</li>
                  </ul>
                </section>

                <section>
                  <h3 style={{ color: '#fff', borderBottom: '1px solid #222', paddingBottom: '8px', margin: '0 0 12px 0' }}>⚙️ Configuración del Sistema</h3>
                  <p>Controles de estado de red a nivel de infraestructura:</p>
                  <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                    <li><strong>Modo Mantenimiento:</strong> Desactiva la plataforma globalmente mostrando pantalla de mantenimiento a usuarios.</li>
                    <li><strong>Feature Flags:</strong> Apagar o encender características específicas (ej. chat IA, búsqueda global, registro público) en caliente.</li>
                  </ul>
                </section>
              </div>
            </Card>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#050505', color: '#eee' }}>
      {/* Sidebar Enterprise */}
      <aside style={{ width: '280px', backgroundColor: '#0a0a0a', borderRight: '1px solid #1a1a1a', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ color: 'var(--color-primary)', fontSize: '1.5rem', margin: 0, fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px' }}>
            AniNexo 
            <span style={{ fontSize: '0.65rem', background: 'rgba(0, 229, 255, 0.1)', color: '#00E5FF', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(0,229,255,0.2)' }}>
              ENTERPRISE
            </span>
          </h1>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={18} />} label="Dashboard" />
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={18} />} label="Usuarios" />
          <TabButton active={activeTab === 'anime'} onClick={() => setActiveTab('anime')} icon={<Database size={18} />} label="Anime CRUD" />
          <TabButton active={activeTab === 'moderation'} onClick={() => setActiveTab('moderation')} icon={<ShieldAlert size={18} />} label="Moderación" badge={reports.filter(r => r.status === 'PENDING').length} />
          <TabButton active={activeTab === 'finances'} onClick={() => setActiveTab('finances')} icon={<Coins size={18} />} label="Finanzas" />
          <TabButton active={activeTab === 'nexo'} onClick={() => setActiveTab('nexo')} icon={<Cpu size={18} />} label="IA Nexo" />
          <TabButton active={activeTab === 'telemetry'} onClick={() => setActiveTab('telemetry')} icon={<Activity size={18} />} label="Telemetría Pro" />
          <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<FileText size={18} />} label="Auditoría" />
          <TabButton active={activeTab === 'emails'} onClick={() => setActiveTab('emails')} icon={<Mail size={18} />} label="Correos" />
          <TabButton active={activeTab === 'system'} onClick={() => setActiveTab('system')} icon={<Settings size={18} />} label="Sistema" />
          <TabButton active={activeTab === 'manual'} onClick={() => setActiveTab('manual')} icon={<FileText size={18} />} label="Manual Admin" />
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid #1a1a1a' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', color: '#888', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', transition: 'color 0.2s' }}>
            <ArrowLeft size={16} /> Salir al Portal
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '3rem', overflowY: 'auto' }}>
        <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, textTransform: 'capitalize', color: '#fff', fontSize: '1.8rem', fontWeight: 800 }}>{activeTab === 'dashboard' ? 'Resumen Ejecutivo' : activeTab}</h2>
            <p style={{ color: '#555', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>Bienvenido de nuevo, Administrador.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
             <div style={{ backgroundColor: '#111', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid #222', fontSize: '0.8rem', color: '#888', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22C55E' }} />
                Status: <span style={{ color: '#22C55E', fontWeight: 600 }}>Sistemas Online</span>
             </div>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.8rem 1rem',
        width: '100%',
        border: 'none',
        borderRadius: '12px',
        backgroundColor: active ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
        color: active ? 'var(--color-primary)' : '#888',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s ease',
        fontWeight: active ? 'bold' : 'normal',
      }}
    >
      <span style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && badge > 0 ? (
        <span style={{ background: '#FF5252', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>{badge}</span>
      ) : null}
    </button>
  );
}

function MetricCard({ icon, label, value, sub, color }: any) {
  return (
    <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: '#555', fontWeight: 600 }}>{label}</span>
        {icon}
      </div>
      <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff' }}>{value}</span>
      <span style={{ fontSize: '0.75rem', color: color }}>{sub}</span>
    </Card>
  );
}

function SuggestionItem({ text, type }: any) {
  const colors: any = { info: '#00E5FF', warning: '#FF5252', idea: '#A855F7' };
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
      <div style={{ width: '4px', height: '40px', background: colors[type], borderRadius: '2px', flexShrink: 0 }} />
      <p style={{ fontSize: '0.85rem', color: '#ccc', margin: 0 }}>{text}</p>
    </div>
  );
}

function SectionError({ errorKey, message, onRetry }: {
  errorKey: string;
  message: string;
  onRetry?: () => void;
}) {
  const isNetworkError = message.toLowerCase().includes('conexión') || message.toLowerCase().includes('red') || message.toLowerCase().includes('fetch');
  const isAuthError = message.toLowerCase().includes('autorización') || message.toLowerCase().includes('sesión') || message.toLowerCase().includes('permisos');
  const isServerError = message.toLowerCase().includes('servidor') || message.toLowerCase().includes('500') || message.toLowerCase().includes('503');
  const isTimeout = message.toLowerCase().includes('tiempo') || message.toLowerCase().includes('408');

  const errorLabel = isNetworkError ? '🌐 Error de Red'
    : isAuthError ? '🔒 Error de Autenticación'
    : isServerError ? '🖥️ Error del Servidor'
    : isTimeout ? '⏱️ Tiempo de Espera Agotado'
    : '⚠️ Error';

  return (
    <div style={{
      padding: '20px', backgroundColor: 'rgba(255, 82, 82, 0.06)',
      border: '1px solid rgba(255, 82, 82, 0.15)', borderRadius: '12px',
      display: 'flex', flexDirection: 'column', gap: '8px',
      margin: '10px 0'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#FF5252', fontWeight: 700, fontSize: '0.9rem' }}>
          {errorLabel}
        </span>
        {onRetry && (
          <button onClick={onRetry} style={{
            background: 'rgba(255, 82, 82, 0.1)', border: '1px solid rgba(255, 82, 82, 0.3)',
            color: '#FF5252', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s'
          }}>
            ↻ Reintentar
          </button>
        )}
      </div>
      <p style={{ margin: 0, color: '#ccc', fontSize: '0.85rem' }}>
        {message}
      </p>
    </div>
  );
}

function SectionLoader({ label }: { label: string }) {
  return (
    <div style={{
      padding: '40px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '12px',
      color: '#888'
    }}>
      <div className="spinner" style={{
        width: '32px', height: '32px', border: '3px solid #222',
        borderTop: '3px solid #00E5FF', borderRadius: '50%'
      }} />
      <span style={{ fontSize: '0.85rem' }}>Cargando {label}...</span>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ViewTransition } from 'react';
import { useNotificationStore, Notification } from '@/store/useNotificationStore';
import { useGlobalSocket } from '@/components/auth/SocketProvider';
import styles from './NotificationDropdown.module.css';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { socket, isConnected } = useGlobalSocket();
  const {
    notifications,
    unreadCount,
    setNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/notifications`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setNotifications(json.data);
      }
    } catch (err) {
      console.error('Error fetching notifications', err);
    } finally {
      setLoading(false);
    }
  }, [setNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (socket && isConnected) {
      socket.on('notification', (data: Notification) => {
        useNotificationStore.getState().addNotification(data);
      });
      return () => {
        socket.off('notification');
      };
    }
  }, [socket, isConnected]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleNotificationClick = async (n: Notification) => {
    if (!n.isRead) {
      try {
        const token = localStorage.getItem('token');
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/notifications/${n.id}/read`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } catch (err) {
        console.error('Error marking notification as read', err);
      }
      markAsRead(n.id);
    }

    if (n.type === 'SYSTEM' && n.referenceId && n.title === 'Nueva solicitud de amistad') {
      handleAcceptFriendRequest(n.referenceId);
    }

    if (n.targetPostId) {
      window.location.href = `/dashboard/feed?post=${n.targetPostId}`;
    } else if (n.targetConversationId) {
      window.location.href = `/dashboard/chat?conversation=${n.targetConversationId}`;
    } else if (n.actorId) {
      window.location.href = `/dashboard/profile/${n.actorUsername}`;
    }
    setIsOpen(false);
  };

  const handleAcceptFriendRequest = async (friendId: string) => {
    try {
      const token = localStorage.getItem('token');
      const userRaw = localStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/friends/accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: user?.id, friendId }),
        }
      );
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error('Error accepting friend request', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/notifications/read-all`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (err) {
      console.error('Error marking all as read', err);
    }
    markAllAsRead();
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'LIKE':
        return '❤️';
      case 'FOLLOW':
        return '👤';
      case 'COMMENT':
        return '💬';
      case 'MENTION':
        return '🏷️';
      case 'MESSAGE':
        return '📩';
      case 'SHARE':
        return '🔗';
      case 'BADGE':
        return '🏆';
      case 'NEXO':
        return '🤖';
      default:
        return '🔔';
    }
  };

  const formatTime = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString();
  };

  const bellSrc = imageError ? '' : '/campana.png';

  return (
    <div className={styles.wrapper} ref={dropdownRef}>
      <button
        className={styles.bellBtn}
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) fetchNotifications();
        }}
        aria-label="Notificaciones"
        aria-expanded={isOpen}
      >
        {bellSrc ? (
          <img src={bellSrc} alt="Notificaciones" className={styles.bellImg} onError={() => setImageError(true)} />
        ) : (
          <span className={styles.bellEmoji}>🔔</span>
        )}
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="dialog" aria-label="Ventana de notificaciones">
            <div className={styles.header}>
              <h3 className={styles.title}>Notificaciones</h3>
              {unreadCount > 0 && (
                <button className={styles.markAllBtn} onClick={handleMarkAllRead}>
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {loading ? (
              <div className={styles.status}>Cargando...</div>
            ) : notifications.length === 0 ? (
              <div className={styles.status}>No tienes notificaciones aún.</div>
            ) : (
              <div className={styles.list}>
                {notifications.slice(0, 50).map((n) => (
                  <div
                    key={n.id}
                    className={`${styles.item} ${!n.isRead ? styles.unread : ''}`}
                    onClick={() => handleNotificationClick(n)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(n)}
                  >
                    <div className={styles.avatarWrap}>
                      {n.actorAvatar ? (
                        <img src={n.actorAvatar} alt={n.actorUsername || ''} className={styles.avatar} />
                      ) : (
                        <span className={styles.icon}>{getIcon(n.type)}</span>
                      )}
                    </div>
                    <div className={styles.content}>
                      <p className={styles.text}>
                        <strong>{n.title}</strong>
                        {n.message && <span className={styles.subtext}> — {n.message}</span>}
                      </p>
                      <span className={styles.time}>{formatTime(n.createdAt)}</span>
                      {n.type === 'SYSTEM' && n.referenceId && n.title === 'Nueva solicitud de amistad' && (
                        <button
                          className={styles.acceptBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptFriendRequest(n.referenceId!);
                          }}
                        >
                          Aceptar
                        </button>
                      )}
                    </div>
                    {!n.isRead && <span className={styles.dot} aria-hidden="true" />}
                  </div>
                ))}
              </div>
            )}
           </div>
       )}
    </div>
  );
};

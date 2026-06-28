import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'LIKE' | 'FOLLOW' | 'COMMENT' | 'MENTION' | 'SYSTEM' | 'BADGE' | 'NEXO' | 'MESSAGE' | 'SHARE';
  referenceId?: string;
  targetPostId?: string;
  targetConversationId?: string;
  actorId?: string;
  actorUsername?: string;
  actorAvatar?: string;
  title: string;
  message?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) => set({ 
    notifications,
    unreadCount: notifications.filter(n => !n.isRead).length
  }),
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + (notification.isRead ? 0 : 1)
  })),
  markAsRead: (id) => set((state) => {
    const updated = state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    return {
      notifications: updated,
      unreadCount: updated.filter(n => !n.isRead).length
    };
  }),
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, isRead: true })),
    unreadCount: 0
  })),
}));

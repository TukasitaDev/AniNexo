'use client';

import { useNotificationStore, Notification } from '../../../store/useNotificationStore';
import styles from './NotificationToast.module.css';

export function NotificationToastContainer() {
  const notifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);

  const recent = notifications.slice(0, 5);

  if (recent.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {recent.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => markAsRead(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Notification, onRemove: () => void }) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'LIKE': return '❤️';
      case 'FOLLOW': return '👤';
      case 'COMMENT': return '💬';
      case 'MENTION': return '🏷️';
      case 'MESSAGE': return '📩';
      case 'SHARE': return '🔗';
      case 'BADGE': return '🏆';
      case 'NEXO': return '🤖';
      default: return '🔔';
    }
  };

  return (
    <div className={styles.toast}>
      <div className={styles.icon}>{getIcon(toast.type)}</div>
      <div className={styles.content}>
        <strong className={styles.title}>{toast.title}</strong>
        {toast.message && <p className={styles.message}>{toast.message}</p>}
      </div>
      <button className={styles.close} onClick={onRemove}>
        ✕
      </button>
    </div>
  );
}

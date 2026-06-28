'use client';

import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { Socket } from 'socket.io-client';
import { useNotificationStore, Notification } from '../../store/useNotificationStore';
import { useChatStore } from '../../store/useChatStore';
import { NotificationToastContainer } from '../ui/NotificationToast/NotificationToast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const useGlobalSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { socket, isConnected } = useSocket();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const { setOnlineStatus, setTyping } = useChatStore();

  useEffect(() => {
    if (socket && isConnected) {
      socket.on('notification', (data: Notification) => {
        addNotification(data);
      });

      socket.on('user_status', ({ userId, status }) => {
        setOnlineStatus(userId, status === 'online');
      });

      socket.on('user_typing', ({ userId, conversationId }) => {
        setTyping(conversationId, userId, true);
      });

      socket.on('user_stop_typing', ({ userId, conversationId }) => {
        setTyping(conversationId, userId, false);
      });
    }

    return () => {
      if (socket) {
        socket.off('notification');
        socket.off('user_status');
        socket.off('user_typing');
        socket.off('user_stop_typing');
      }
    };
  }, [socket, isConnected, addNotification, setOnlineStatus, setTyping]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      <NotificationToastContainer />
      {children}
    </SocketContext.Provider>
  );
}

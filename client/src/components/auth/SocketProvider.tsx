'use client';

import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { Socket } from 'socket.io-client';
import { useNotificationStore } from '../../store/useNotificationStore';
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
  const addToast = useNotificationStore((s) => s.addToast);
  const { setUserStatus, setTyping } = useChatStore();

  useEffect(() => {
    if (socket && isConnected) {
      // Notificaciones
      socket.on('notification', (data) => {
        console.log('🔔 Nueva Notificación Global:', data);
        addToast(data);
      });

      // Presencia
      socket.on('user_status', ({ userId, status }) => {
        setUserStatus(userId, status);
      });

      // Escritura
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
      }
    };
  }, [socket, isConnected]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      <NotificationToastContainer />
      {children}
    </SocketContext.Provider>
  );
}

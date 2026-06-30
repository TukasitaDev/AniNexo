'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FriendsModal } from '../profile/FriendsModal';
import { ChatWindow } from '../profile/ChatWindow';
import { useGlobalSocket } from '../auth/SocketProvider';

export const MessengerChatButton: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { socket, isConnected } = useGlobalSocket();

  // Chat state — lifted from FriendsModal
  const [activeChatFriend, setActiveChatFriend] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      try { setUser(JSON.parse(u)); } catch {}
    }
  }, []);

  // Pulse every 30s when closed
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isOpen) {
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 1500);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Listen to new messages in real-time
  useEffect(() => {
    if (socket && isConnected) {
      const handleNewMessage = (msg: any) => {
        if (msg.conversationId === conversationId) {
          setChatMessages(prev => {
            // Prevent duplicate renderings
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      };

      socket.on('new_message', handleNewMessage);
      return () => {
        socket.off('new_message', handleNewMessage);
      };
    }
  }, [socket, isConnected, conversationId]);

  const handleStartChat = (friend: any, convId: string, messages: any[]) => {
    setActiveChatFriend(friend);
    setConversationId(convId);
    setChatMessages(messages);
    setChatInput('');
  };

  const handleCloseChat = () => {
    setActiveChatFriend(null);
    setConversationId(null);
    setChatMessages([]);
    setChatInput('');
  };

  // Clean click outside event
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as HTMLElement)) {
        setIsOpen(false);
        setActiveChatFriend(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSendMessage = async (content: string, type: string = 'text') => {
    if (!content.trim() || !conversationId || !user?.id) return;
    if (!socket || !isConnected) {
      console.error('Socket no conectado, reintentando por HTTP...');
      // Fallback a HTTP si no hay socket activo
      setIsSending(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/messaging/send`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ conversationId, senderId: user.id, content: content.trim() }),
          }
        );
        const data = await res.json();
        if (res.ok && data.success) {
          setChatMessages(prev => [
            ...prev,
            {
              id: data.data?.id ?? Date.now(),
              content,
              type,
              senderId: user.id,
              createdAt: data.data?.createdAt ?? new Date().toISOString(),
              sender: { username: user.username, avatarUrl: user.avatarUrl },
            },
          ]);
          setChatInput('');
        }
      } catch (err) {
        console.error('Error de red en fallback HTTP:', err);
      } finally {
        setIsSending(false);
      }
      return;
    }

    // Envío súper rápido y confiable por WebSockets
    socket.emit('send_message', {
      conversationId,
      senderId: user.id,
      content: content.trim()
    });
    setChatInput('');
  };

  if (!user) return null;

  return (
    <div ref={containerRef} className="msgr-root">
      {/* ===== Chat window — to the LEFT of the friends panel ===== */}
      {activeChatFriend && (
        <div className="msgr-chat-slot">
          <ChatWindow
            profile={activeChatFriend}
            currentUser={user}
            conversationId={conversationId}
            chatMessages={chatMessages}
            chatInput={chatInput}
            isConnected={!!conversationId}
            isSending={isSending}
            setChatInput={setChatInput}
            onSendMessage={handleSendMessage}
            onClose={handleCloseChat}
          />
        </div>
      )}

      {/* ===== Friends panel — always shows when isOpen ===== */}
      {isOpen && (
        <div className="msgr-panel">
          {/* Panel header */}
          <div className="msgr-panel-header">
            <div className="msgr-panel-header-left">
              <div className="msgr-avatar-sm">
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt={user.username} />
                  : <span>{user.username?.charAt(0)?.toUpperCase()}</span>
                }
                <span className="msgr-online-dot" />
              </div>
              <div>
                <p className="msgr-panel-title">Mensajes</p>
                <p className="msgr-panel-sub">@{user.username}</p>
              </div>
            </div>
            <button
              className="msgr-header-btn"
              title="Minimizar"
              aria-label="Cerrar panel"
              onClick={() => { setIsOpen(false); setActiveChatFriend(null); }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Friends list */}
          <div className="msgr-panel-body">
            <FriendsModal
              userId={user.id}
              onClose={() => setIsOpen(false)}
              currentUser={user}
              isDropdown={true}
              onStartChat={handleStartChat}
            />
          </div>
        </div>
      )}

      {/* ===== Floating Action Button ===== */}
      <button
        className={`msgr-fab ${isPulsing ? 'msgr-fab-pulse' : ''} ${isOpen ? 'msgr-fab-active' : ''}`}
        onClick={() => {
          setIsOpen(o => !o);
          if (isOpen) setActiveChatFriend(null);
        }}
        aria-label="Abrir chats de amigos"
        title="Chats de amigos"
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <img 
            src="/nexo_chat_mascot.png?v=4" 
            alt="Nexo" 
            style={{ 
              width: '100%', 
              height: '100%', 
              borderRadius: '50%', 
              objectFit: 'cover' 
            }} 
          />
        )}
        {!isOpen && <span className="msgr-fab-ring" />}
      </button>

      <style jsx>{`
        /* ===== ROOT — fixed bottom-right anchor ===== */
        .msgr-root {
          position: fixed;
          bottom: 28px;
          right: 108px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          pointer-events: none;
        }
        .msgr-root > * { pointer-events: all; }

        /* ===== CHAT + PANEL row — side by side ===== */
        .msgr-chat-slot {
          /* ChatWindow sits to the left of the panel in the horizontal layout */
          order: -2;
        }

        /* When chat is open, arrange the whole row horizontally */
        .msgr-root {
          flex-direction: row;
          align-items: flex-end;
          flex-wrap: nowrap;
        }

        /* FAB always last */
        .msgr-fab { order: 10; }
        .msgr-panel { order: 5; }
        .msgr-chat-slot { order: 1; }

        /* ===== FRIENDS PANEL ===== */
        .msgr-panel {
          width: 340px;
          max-height: 490px;
          background: rgba(8, 8, 14, 0.97);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          overflow: hidden;
          box-shadow:
            0 30px 70px rgba(0,0,0,0.7),
            0 0 0 0.5px rgba(255,255,255,0.05),
            0 0 40px rgba(8,102,255,0.06);
          display: flex;
          flex-direction: column;
          animation: panelIn 0.32s cubic-bezier(0.16,1,0.3,1) both;
          transform-origin: bottom right;
        }
        @keyframes panelIn {
          from { opacity:0; transform: scale(0.88) translateY(14px); }
          to   { opacity:1; transform: scale(1) translateY(0); }
        }

        /* ===== PANEL HEADER ===== */
        .msgr-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px 12px;
          background: linear-gradient(135deg, #0866ff 0%, #0099ff 50%, #5f00ff 100%);
          flex-shrink: 0;
        }
        .msgr-panel-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .msgr-avatar-sm {
          width: 38px; height: 38px;
          border-radius: 50%;
          position: relative;
          background: rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          overflow: visible;
          flex-shrink: 0;
          border: 2px solid rgba(255,255,255,0.4);
        }
        .msgr-avatar-sm img {
          width: 100%; height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }
        .msgr-avatar-sm span { color:white; font-weight:900; font-size:0.95rem; }
        .msgr-online-dot {
          position: absolute; bottom:0; right:0;
          width: 10px; height: 10px;
          background: #31a24c; border-radius: 50%;
          border: 2px solid #0866ff;
          box-shadow: 0 0 5px rgba(49,162,76,0.8);
        }
        .msgr-panel-title { font-size:0.95rem; font-weight:800; color:white; margin:0; }
        .msgr-panel-sub { font-size:0.7rem; color:rgba(255,255,255,0.7); margin:0; }
        .msgr-header-btn {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          border: none; color: white; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .msgr-header-btn:hover { background: rgba(255,255,255,0.28); }

        /* ===== PANEL BODY (FriendsModal) ===== */
        .msgr-panel-body {
          flex: 1;
          overflow: hidden;
          min-height: 0;
        }

        /* ===== FAB ===== */
        .msgr-fab {
          width: 58px; height: 58px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          position: relative;
          background: transparent;
          padding: 0;
          overflow: hidden;
          box-shadow:
            0 6px 22px rgba(8,102,255,0.4),
            0 2px 8px rgba(0,0,0,0.3);
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease;
          animation: fabAppear 0.4s cubic-bezier(0.16,1,0.3,1) both;
          flex-shrink: 0;
        }
        @keyframes fabAppear {
          from { opacity:0; transform: scale(0) rotate(-90deg); }
          to   { opacity:1; transform: scale(1) rotate(0deg); }
        }
        .msgr-fab:hover {
          transform: scale(1.1);
          box-shadow: 0 8px 30px rgba(8,102,255,0.7), 0 2px 12px rgba(0,0,0,0.5);
        }
        .msgr-fab:active { transform: scale(0.95); }
        .msgr-fab-active {
          background: linear-gradient(135deg, #0866ff, #5f00ff);
          box-shadow: 0 6px 22px rgba(95,0,255,0.5), 0 0 0 3px rgba(8,102,255,0.2);
        }

        /* Breathing ring */
        .msgr-fab-ring {
          position: absolute; inset: -3px;
          border-radius: 50%;
          border: 2px solid rgba(8,102,255,0.4);
          animation: ringBreath 3s ease-in-out infinite;
        }
        @keyframes ringBreath {
          0%,100% { transform:scale(1); opacity:0.5; }
          50%      { transform:scale(1.12); opacity:0.15; }
        }

        /* Pulse attention */
        .msgr-fab-pulse {
          animation: fabPulse 0.6s ease-out 3;
        }
        @keyframes fabPulse {
          0%   { box-shadow: 0 6px 22px rgba(8,102,255,0.55), 0 0 0 0 rgba(8,102,255,0.6); }
          50%  { box-shadow: 0 6px 22px rgba(8,102,255,0.55), 0 0 0 16px rgba(8,102,255,0); }
          100% { box-shadow: 0 6px 22px rgba(8,102,255,0.55), 0 0 0 0 rgba(8,102,255,0); }
        }
      `}</style>
    </div>
  );
};

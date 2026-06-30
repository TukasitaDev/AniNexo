'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FriendsModal } from '../profile/FriendsModal';

export const MessengerChatButton: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      try {
        const parsed = JSON.parse(u);
        setUser(parsed);
      } catch {}
    }
  }, []);

  // Pulse effect every 30s to draw attention
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isOpen) {
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 1500);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as HTMLElement)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  return (
    <div ref={containerRef} className={`msgr-root ${isOpen ? 'msgr-open' : ''}`}>
      {/* Floating Panel */}
      {isOpen && (
        <div className="msgr-panel">
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
            <div className="msgr-panel-header-actions">
              <button className="msgr-header-btn" title="Editar" aria-label="Editar mensaje">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button className="msgr-header-btn" title="Cerrar" aria-label="Cerrar panel" onClick={() => setIsOpen(false)}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="msgr-panel-body">
            <FriendsModal
              userId={user.id}
              onClose={() => setIsOpen(false)}
              currentUser={user}
              isDropdown={true}
            />
          </div>
        </div>
      )}

      {/* Messenger FAB */}
      <button
        className={`msgr-fab ${isPulsing ? 'msgr-fab-pulse' : ''} ${isOpen ? 'msgr-fab-active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir chats de amigos"
        title="Chats de amigos"
      >
        {isOpen ? (
          /* Down chevron when open */
          <svg viewBox="0 0 24 24" width="26" height="26" fill="white">
            <path d="M19 9l-7 7-7-7" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          /* Messenger logo icon */
          <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
            <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.9 1.15 5.56 3.2 7.42.16.15.26.37.26.6l-.08 2.2a.8.8 0 0 0 1.15.75l2.48-1.37c.18-.1.4-.1.6-.04 1.16.32 2.37.49 3.6.49 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2zm1.18 11.23-2.02-2.15-3.95 2.15c-.42.23-.92-.25-.7-.7l2.02-4.32a.8.8 0 0 1 1.09-.43l2.02 2.15 3.95-2.15c.42-.23.92-.25.7.7l-2.02 4.32a.8.8 0 0 1-1.09-.43z" />
          </svg>
        )}
        {/* Glow ring animation when closed */}
        {!isOpen && <span className="msgr-fab-ring" />}
      </button>

      <style jsx>{`
        /* ===== ROOT ===== */
        .msgr-root {
          position: fixed;
          bottom: 28px;
          right: 108px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
          pointer-events: none;
        }
        .msgr-root > * {
          pointer-events: all;
        }

        /* ===== PANEL ===== */
        .msgr-panel {
          width: 360px;
          max-height: 520px;
          background: rgba(10, 10, 14, 0.97);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          overflow: hidden;
          box-shadow:
            0 30px 70px rgba(0, 0, 0, 0.7),
            0 0 0 0.5px rgba(255, 255, 255, 0.06),
            0 0 40px rgba(0, 120, 255, 0.06);
          display: flex;
          flex-direction: column;
          animation: panelIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          transform-origin: bottom right;
        }

        @keyframes panelIn {
          from { opacity: 0; transform: scale(0.85) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* ===== PANEL HEADER ===== */
        .msgr-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px 14px;
          background: linear-gradient(135deg, #0866ff 0%, #0099ff 50%, #5f00ff 100%);
          flex-shrink: 0;
        }

        .msgr-panel-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .msgr-avatar-sm {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          position: relative;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
          flex-shrink: 0;
          border: 2px solid rgba(255,255,255,0.4);
        }

        .msgr-avatar-sm img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .msgr-avatar-sm span {
          color: white;
          font-weight: 900;
          font-size: 1rem;
        }

        .msgr-online-dot {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 11px;
          height: 11px;
          background: #31a24c;
          border-radius: 50%;
          border: 2px solid #0866ff;
          box-shadow: 0 0 6px rgba(49, 162, 76, 0.8);
        }

        .msgr-panel-title {
          font-size: 1rem;
          font-weight: 800;
          color: white;
          margin: 0;
          letter-spacing: -0.2px;
        }

        .msgr-panel-sub {
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
        }

        .msgr-panel-header-actions {
          display: flex;
          gap: 4px;
        }

        .msgr-header-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          backdrop-filter: blur(5px);
        }

        .msgr-header-btn:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        /* ===== PANEL BODY ===== */
        .msgr-panel-body {
          flex: 1;
          overflow: hidden;
          min-height: 0;
        }

        /* Override FriendsModal dropdown styles within the panel */
        .msgr-panel-body :global(.dropdown-overlay) {
          position: static !important;
          transform: none !important;
          width: 100% !important;
          animation: none !important;
          display: flex !important;
        }

        .msgr-panel-body :global(.dropdown-content) {
          width: 100% !important;
          max-height: 400px !important;
          border-radius: 0 !important;
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          animation: none !important;
        }

        .msgr-panel-body :global(.modal-header) {
          display: none !important;
        }

        .msgr-panel-body :global(.friends-list) {
          padding: 12px !important;
          max-height: 400px !important;
          overflow-y: auto !important;
        }

        .msgr-panel-body :global(.friend-item) {
          border-radius: 12px !important;
          transition: background 0.15s !important;
        }

        .msgr-panel-body :global(.friend-item:hover) {
          background: rgba(255,255,255,0.06) !important;
        }

        .msgr-panel-body :global(.friend-avatar) {
          border: 2px solid rgba(255,255,255,0.1) !important;
        }

        .msgr-panel-body :global(.btn-icon) {
          color: rgba(255,255,255,0.4) !important;
        }

        .msgr-panel-body :global(.btn-icon:hover) {
          background: rgba(8, 102, 255, 0.15) !important;
          color: #0099ff !important;
        }

        .msgr-panel-body :global(.empty-message),
        .msgr-panel-body :global(.loading) {
          padding: 50px 20px !important;
          color: rgba(255,255,255,0.4) !important;
          text-align: center !important;
        }

        /* ===== FAB BUTTON ===== */
        .msgr-fab {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background: linear-gradient(135deg, #0866ff 0%, #0099ff 50%, #5f00ff 100%);
          box-shadow:
            0 6px 24px rgba(8, 102, 255, 0.55),
            0 2px 8px rgba(0, 0, 0, 0.4),
            0 0 0 0 rgba(8, 102, 255, 0);
          transition:
            transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.25s ease;
          animation: fabAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes fabAppear {
          from { opacity: 0; transform: scale(0) rotate(-90deg); }
          to   { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        .msgr-fab:hover {
          transform: scale(1.1);
          box-shadow:
            0 8px 32px rgba(8, 102, 255, 0.7),
            0 2px 12px rgba(0, 0, 0, 0.5);
        }

        .msgr-fab:active {
          transform: scale(0.96);
        }

        .msgr-fab-active {
          background: linear-gradient(135deg, #0866ff, #5f00ff);
          box-shadow:
            0 6px 24px rgba(95, 0, 255, 0.55),
            0 0 0 3px rgba(8, 102, 255, 0.25);
        }

        /* ===== RING PULSE ===== */
        .msgr-fab-ring {
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          border: 2px solid rgba(8, 102, 255, 0.4);
          animation: ringBreath 3s ease-in-out infinite;
        }

        @keyframes ringBreath {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50%       { transform: scale(1.12); opacity: 0.15; }
        }

        /* ===== ATTENTION PULSE ===== */
        .msgr-fab-pulse {
          animation: fabPulse 0.6s ease-out 3;
        }

        @keyframes fabPulse {
          0%   { box-shadow: 0 6px 24px rgba(8, 102, 255, 0.55), 0 0 0 0 rgba(8, 102, 255, 0.6); }
          50%  { box-shadow: 0 6px 24px rgba(8, 102, 255, 0.55), 0 0 0 16px rgba(8, 102, 255, 0); }
          100% { box-shadow: 0 6px 24px rgba(8, 102, 255, 0.55), 0 0 0 0 rgba(8, 102, 255, 0); }
        }
      `}</style>
    </div>
  );
};

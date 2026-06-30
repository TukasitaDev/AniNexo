'use client';

import React, { useEffect, useState } from 'react';
import { MessageCircle, Edit2, UserMinus } from 'lucide-react';

interface FriendsModalProps {
  userId: string;
  onClose: () => void;
  currentUser: any;
  isDropdown?: boolean;
  /** Called when the user clicks "message" on a friend — chat is handled by the parent */
  onStartChat?: (friend: any, conversationId: string, messages: any[]) => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  userId,
  onClose,
  currentUser,
  isDropdown = false,
  onStartChat,
}) => {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFriend, setEditingFriend] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [openingChat, setOpeningChat] = useState<string | null>(null);

  useEffect(() => {
    fetchFriends();
  }, [userId]);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/friends/list-with-nicknames/${userId}`
      );
      const data = await res.json();
      if (data.success) setFriends(data.data);
    } catch (err) {
      console.error('Error fetching friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/friends/${friendId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userId }),
        }
      );
      setFriends(prev => prev.filter(f => f.id !== friendId));
    } catch (err) {
      console.error('Error removing friend:', err);
    }
  };

  const handleSetNickname = async (friendId: string) => {
    if (!nicknameInput.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/friends/${friendId}/nickname`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userId, nickname: nicknameInput.trim() }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setFriends(prev =>
          prev.map(f => (f.id === friendId ? { ...f, nickname: nicknameInput.trim() } : f))
        );
        setEditingFriend(null);
        setNicknameInput('');
      }
    } catch (err) {
      console.error('Error setting nickname:', err);
    }
  };

  const handleStartMessage = async (friend: any) => {
    if (openingChat === friend.id) return;
    setOpeningChat(friend.id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/messaging/conversation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userA: currentUser?.id, userB: friend.id }),
        }
      );
      const data = await res.json();
      if (data.success) {
        // Fetch messages for this conversation
        let messages: any[] = [];
        try {
          const msgRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/messaging/${data.data.id}`
          );
          const msgData = await msgRes.json();
          if (msgData.success) messages = msgData.data;
        } catch {}

        onStartChat?.(friend, data.data.id, messages);
      }
    } catch (err) {
      console.error('Error starting conversation:', err);
    } finally {
      setOpeningChat(null);
    }
  };

  return (
    <div className={isDropdown ? 'dropdown-overlay' : 'modal-overlay'} onClick={isDropdown ? undefined : onClose}>
      <div className={isDropdown ? 'dropdown-content' : 'modal-content'} onClick={e => e.stopPropagation()}>

        {/* Header — only shown in full modal mode */}
        {!isDropdown && (
          <div className="modal-header">
            <h2>Amigos</h2>
            <button className="btn-close" onClick={onClose}>✕</button>
          </div>
        )}

        <div className="friends-list">
          {loading ? (
            <div className="friends-loading">
              <div className="friends-spinner" />
              <span>Cargando amigos...</span>
            </div>
          ) : friends.length === 0 ? (
            <div className="friends-empty">
              <span className="friends-empty-icon">👥</span>
              <p>No tienes amigos agregados aún</p>
            </div>
          ) : (
            friends.map(friend => (
              <div key={friend.id} className="friend-item">
                <div className="friend-avatar-wrap">
                  <img
                    src={
                      friend.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${friend.username}&background=0866ff&color=fff`
                    }
                    alt={friend.username}
                    className="friend-avatar"
                  />
                  <span className="friend-online-dot" />
                </div>

                <div className="friend-info">
                  {editingFriend === friend.id ? (
                    <input
                      type="text"
                      value={nicknameInput}
                      onChange={e => setNicknameInput(e.target.value)}
                      onBlur={() => handleSetNickname(friend.id)}
                      onKeyDown={e => e.key === 'Enter' && handleSetNickname(friend.id)}
                      placeholder="Apodo..."
                      className="nickname-input"
                      autoFocus
                    />
                  ) : (
                    <span className="friend-name">{friend.nickname || friend.username}</span>
                  )}
                  {friend.isPremium && <span className="premium-badge">PRO</span>}
                </div>

                <div className="friend-actions">
                  <button
                    className="btn-icon"
                    onClick={() => { setEditingFriend(friend.id); setNicknameInput(friend.nickname || ''); }}
                    title="Editar apodo"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className={`btn-icon btn-msg ${openingChat === friend.id ? 'btn-loading' : ''}`}
                    onClick={() => handleStartMessage(friend)}
                    title="Enviar mensaje"
                  >
                    {openingChat === friend.id
                      ? <span className="btn-spinner" />
                      : <MessageCircle size={14} />
                    }
                  </button>
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => handleRemoveFriend(friend.id)}
                    title="Eliminar amigo"
                  >
                    <UserMinus size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <style jsx>{`
          /* ---- Dropdown mode (inside Messenger panel) ---- */
          .dropdown-overlay {
            position: static;
            width: 100%;
            display: flex;
          }
          .dropdown-content {
            width: 100%;
            background: transparent;
            display: flex;
            flex-direction: column;
          }

          /* ---- Full modal mode ---- */
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.8);
            backdrop-filter: blur(10px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: fade-in 0.2s ease;
          }
          @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

          .modal-content {
            width: 100%;
            max-width: 440px;
            max-height: 80vh;
            background: rgba(10,10,18,0.98);
            backdrop-filter: blur(40px);
            border: 1px solid rgba(0,229,255,0.15);
            border-radius: 22px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 40px 100px rgba(0,0,0,0.85);
            animation: modal-in 0.3s cubic-bezier(0.16,1,0.3,1);
          }
          @keyframes modal-in {
            from { opacity:0; transform: scale(0.88) translateY(24px); }
            to   { opacity:1; transform: scale(1) translateY(0); }
          }

          .modal-header {
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .modal-header h2 { margin:0; color:#00E5FF; font-weight:900; font-size:1.2rem; }
          .btn-close {
            background:none; border:none; color:#888; cursor:pointer;
            font-size:1.2rem; padding:4px 8px; border-radius:6px; transition:0.2s;
          }
          .btn-close:hover { background:rgba(255,255,255,0.08); color:#fff; }

          /* ---- Friends list ---- */
          .friends-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
            display: flex;
            flex-direction: column;
            gap: 2px;
            max-height: 380px;
          }
          .friends-list::-webkit-scrollbar { width: 4px; }
          .friends-list::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.1);
            border-radius: 2px;
          }

          .friends-loading, .friends-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 40px 20px;
            color: rgba(255,255,255,0.35);
            font-size: 0.85rem;
          }
          .friends-spinner {
            width: 22px; height: 22px;
            border: 2px solid rgba(8,102,255,0.2);
            border-top-color: #0866ff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          .friends-empty-icon { font-size: 2rem; }

          /* ---- Friend row ---- */
          .friend-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 10px;
            border-radius: 12px;
            transition: background 0.15s;
            cursor: default;
          }
          .friend-item:hover { background: rgba(255,255,255,0.05); }

          .friend-avatar-wrap {
            position: relative;
            width: 38px;
            height: 38px;
            flex-shrink: 0;
          }
          .friend-avatar {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(255,255,255,0.08);
          }
          .friend-online-dot {
            position: absolute;
            bottom: 1px; right: 1px;
            width: 9px; height: 9px;
            background: #31a24c;
            border-radius: 50%;
            border: 2px solid rgba(8,8,14,0.9);
          }

          .friend-info {
            flex: 1;
            min-width: 0;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .friend-name {
            font-size: 0.88rem;
            font-weight: 700;
            color: #e0e0e0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .premium-badge {
            background: linear-gradient(135deg, #f59e0b, #ef4444);
            color: white;
            font-size: 0.6rem;
            font-weight: 900;
            padding: 1px 5px;
            border-radius: 4px;
            letter-spacing: 0.5px;
            flex-shrink: 0;
          }

          .nickname-input {
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(8,102,255,0.4);
            border-radius: 8px;
            padding: 4px 8px;
            color: white;
            font-size: 0.85rem;
            outline: none;
            width: 100%;
          }

          .friend-actions {
            display: flex;
            gap: 2px;
            flex-shrink: 0;
          }
          .btn-icon {
            background: transparent;
            border: none;
            color: rgba(255,255,255,0.35);
            cursor: pointer;
            padding: 6px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.18s;
            width: 30px;
            height: 30px;
          }
          .btn-icon:hover {
            background: rgba(8,102,255,0.15);
            color: #60a5fa;
          }
          .btn-msg:hover {
            background: rgba(8,102,255,0.18) !important;
            color: #0866ff !important;
          }
          .btn-danger:hover {
            background: rgba(239,68,68,0.15) !important;
            color: #ef4444 !important;
          }
          .btn-loading { opacity: 0.7; cursor: wait; }
          .btn-spinner {
            display: block;
            width: 12px;
            height: 12px;
            border: 1.5px solid rgba(96,165,250,0.3);
            border-top-color: #60a5fa;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
          }
        `}</style>
      </div>
    </div>
  );
};
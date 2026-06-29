'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '../ui/Card/Card';
import { X, MessageCircle, Trash2, Edit2, UserMinus } from 'lucide-react';
import { ChatModal } from './ChatModal';

interface FriendsModalProps {
  userId: string;
  onClose: () => void;
  currentUser: any;
  isDropdown?: boolean;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({ userId, onClose, currentUser, isDropdown = false }) => {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFriend, setEditingFriend] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchFriends();
  }, [userId]);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/friends/list-with-nicknames/${userId}`);
      const data = await res.json();
      if (data.success) {
        setFriends(data.data);
      }
    } catch (err) {
      console.error('Error fetching friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/friends/${friendId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      setFriends(prev => prev.filter(f => f.id !== friendId));
    } catch (err) {
      console.error('Error removing friend:', err);
    }
  };

  const handleSetNickname = async (friendId: string) => {
    if (!nicknameInput.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/friends/${friendId}/nickname`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, nickname: nicknameInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setFriends(prev => prev.map(f => f.id === friendId ? { ...f, nickname: nicknameInput.trim() } : f));
        setEditingFriend(null);
        setNicknameInput('');
      }
    } catch (err) {
      console.error('Error setting nickname:', err);
    }
  };

  const handleStartMessage = async (friend: any) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/messaging/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userA: currentUser?.id,
          userB: friend.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setConversationId(data.data.id);
        setSelectedFriend(friend);
        setShowChatModal(true);
        fetchMessages(data.data.id);
      }
    } catch (err) {
      console.error('Error starting conversation:', err);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/messaging/${convId}`);
      const data = await res.json();
      if (data.success) {
        setChatMessages(data.data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !conversationId || !currentUser?.id) return;

    setIsSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/messaging/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          conversationId,
          senderId: currentUser.id,
          content: content.trim()
        })
      });

      if (res.ok) {
        setChatMessages(prev => [...prev, {
          id: Date.now(),
          content: content,
          createdAt: new Date().toISOString(),
          sender: { username: currentUser.username, avatarUrl: currentUser.avatarUrl }
        }]);
        setChatInput('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={isDropdown ? "dropdown-overlay" : "modal-overlay"} onClick={isDropdown ? undefined : onClose}>
      {showChatModal && (
        <ChatModal
          profile={selectedFriend}
          currentUser={currentUser}
          conversationId={conversationId}
          chatMessages={chatMessages}
          chatInput={chatInput}
          isConnected={!!conversationId}
          isSending={isSending}
          setChatInput={setChatInput}
          onSendMessage={handleSendMessage}
          onClose={() => setShowChatModal(false)}
        />
      )}
      <div className={isDropdown ? "dropdown-content" : "modal-content"} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Amigos</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="friends-list">
          {loading ? (
            <div className="loading">Cargando amigos...</div>
          ) : friends.length === 0 ? (
            <p className="empty-message">No tienes amigos agregados aún</p>
          ) : (
            friends.map((friend) => (
              <div key={friend.id} className="friend-item">
                <img
                  src={friend.avatarUrl || `https://ui-avatars.com/api/?name=${friend.username}`}
                  alt={friend.username}
                  className="friend-avatar"
                />
                <div className="friend-info">
                  {editingFriend === friend.id ? (
                    <input
                      type="text"
                      value={nicknameInput}
                      onChange={(e) => setNicknameInput(e.target.value)}
                      onBlur={() => handleSetNickname(friend.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSetNickname(friend.id)}
                      placeholder="Apodo..."
                      className="nickname-input"
                      autoFocus
                    />
                  ) : (
                    <span className="friend-name">{friend.nickname || friend.username}</span>
                  )}
                  {friend.isPremium && <span className="premium-badge">PREMIUM</span>}
                </div>
                <div className="friend-actions">
                  <button
                    className="btn-icon"
                    onClick={() => {
                      setEditingFriend(friend.id);
                      setNicknameInput(friend.nickname || '');
                    }}
                    title="Editar apodo"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleStartMessage(friend)}
                    title="Enviar mensaje"
                  >
                    <MessageCircle size={16} />
                  </button>
                  <button
                    className="btn-icon danger"
                    onClick={() => handleRemoveFriend(friend.id)}
                    title="Eliminar amigo"
                  >
                    <UserMinus size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <style jsx>{`
          .dropdown-overlay {
            position: absolute;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            width: 280px;
            z-index: 2500;
            display: flex;
            animation: fade-in 0.2s ease;
          }

          .dropdown-content {
            width: 100%;
            max-height: 400px;
            background: rgba(15, 15, 15, 0.95);
            backdrop-filter: blur(25px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
            overflow: hidden;
            animation: modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .dropdown-content .modal-header {
            padding: 12px 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }

          .dropdown-content .modal-header h2 {
            font-size: 1rem;
            color: white;
            font-weight: 800;
          }

          .dropdown-content .friends-list {
            padding: 8px;
            gap: 2px;
          }

          .dropdown-content .friend-item {
            padding: 8px 12px;
            border-radius: 10px;
            background: transparent;
            gap: 10px;
          }

          .dropdown-content .friend-item:hover {
            background: rgba(255, 255, 255, 0.05);
          }

          .dropdown-content .friend-avatar {
            width: 32px;
            height: 32px;
          }

          .dropdown-content .friend-name {
            font-size: 0.9rem;
            color: #ccc;
          }

          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.8);
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
            max-width: 480px;
            max-height: 80vh;
            background: rgba(10, 10, 18, 0.98);
            backdrop-filter: blur(40px);
            border: 1px solid rgba(0, 229, 255, 0.15);
            border-radius: 22px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(0,82,255,0.1);
            animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }

          @keyframes modal-in {
            from { opacity: 0; transform: scale(0.88) translateY(24px); }
            to   { opacity: 1; transform: scale(1)    translateY(0); }
          }

          .modal-header {
            padding: 20px;
            border-bottom: 1px solid var(--color-secondary);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .modal-header h2 {
            margin: 0;
            color: var(--color-primary);
            font-weight: 900;
          }

          .btn-close {
            background: none;
            border: none;
            color: var(--color-text-main);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: background 0.2s;
          }

          .btn-close:hover {
            background: rgba(255, 255, 255, 0.1);
          }

          .friends-list {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .friend-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.02);
            transition: background 0.2s;
          }

          .friend-item:hover {
            background: rgba(255, 255, 255, 0.05);
          }

          .friend-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
          }

          .friend-info {
            flex: 1;
          }

          .friend-name {
            color: var(--color-text-main);
            font-weight: 600;
          }

          .premium-badge {
            margin-left: 8px;
            background: gold;
            color: black;
            font-size: 0.65rem;
            font-weight: 900;
            padding: 2px 6px;
            border-radius: 4px;
          }

          .nickname-input {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--color-primary);
            border-radius: 6px;
            padding: 4px 8px;
            color: white;
            font-size: 0.9rem;
            outline: none;
            width: 100%;
          }

          .friend-actions {
            display: flex;
            gap: 4px;
          }

          .btn-icon {
            background: transparent;
            border: none;
            color: #888;
            cursor: pointer;
            padding: 6px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }

          .btn-icon:hover {
            background: rgba(0, 229, 255, 0.1);
            color: var(--color-primary);
          }

          .btn-icon.danger:hover {
            background: rgba(255, 71, 89, 0.1);
            color: #ff4759;
          }

          .loading, .empty-message {
            padding: 40px;
            text-align: center;
            color: var(--color-text-muted);
          }

          .friends-list::-webkit-scrollbar {
            width: 6px;
          }

          .friends-list::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
          }
        `}</style>
      </div>
    </div>
  );
};
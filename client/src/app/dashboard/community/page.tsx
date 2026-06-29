'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { FeedList } from '../../../components/feed/FeedList';
import { FriendsModal } from '../../../components/profile/FriendsModal';
import { SavedPostsModal } from '../../../components/feed/SavedPostsModal';
import { MemoriesModal } from '../../../components/feed/MemoriesModal';
import { 
  Sparkles, 
  Users, 
  Bookmark, 
  History, 
  Award, 
  Search, 
  MoreHorizontal, 
  Plus, 
  ChevronDown, 
  Compass,
  Tv,
  Gift,
  MessageCircle,
  X,
  Camera,
  Palette
} from 'lucide-react';

interface RecentAnime {
  id: string;
  title: string;
  coverImage: string;
  lastVisited: string;
}

const groupThemes = [
  { name: 'Blue', gradient: 'linear-gradient(135deg, #00E5FF, #00B8D4)' },
  { name: 'Purple', gradient: 'linear-gradient(135deg, #9C27B0, #673AB7)' },
  { name: 'Red', gradient: 'linear-gradient(135deg, #F44336, #E91E63)' },
  { name: 'Green', gradient: 'linear-gradient(135deg, #4CAF50, #8BC34A)' },
  { name: 'Orange', gradient: 'linear-gradient(135deg, #FF9800, #FFC107)' },
  { name: 'Pink', gradient: 'linear-gradient(135deg, #E91E63, #F06292)' },
];

export default function CommunityPage() {
  const [user, setUser] = useState<any>(null);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [searchContact, setSearchContact] = useState('');
  const [showAllLeftItems, setShowAllLeftItems] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(groupThemes[0].gradient);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [userFriends, setUserFriends] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [showChatBubble, setShowChatBubble] = useState(false);

  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [showMemoriesModal, setShowMemoriesModal] = useState(false);

  const [showNexoModal, setShowNexoModal] = useState(false);
  const [showLogrosModal, setShowLogrosModal] = useState(false);
  const [showGroupsModal, setShowGroupsModal] = useState(false);

  // Nexo AI chat state
  const [nexoMessages, setNexoMessages] = useState<any[]>([
    { id: 1, sender: 'nexo', text: '¡Hola! Soy Nexo, tu asistente otaku personal en AniNexo. ¿De qué anime quieres hablar hoy?' }
  ]);
  const [nexoInput, setNexoInput] = useState('');
  const [nexoLoading, setNexoLoading] = useState(false);

  // Groups state for modal
  const [modalGroups, setModalGroups] = useState<any[]>([]);
  const [loadingModalGroups, setLoadingModalGroups] = useState(false);

  useEffect(() => {
    if (showGroupsModal) {
      const fetchModalGroups = async () => {
        try {
          setLoadingModalGroups(true);
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/groups`);
          const data = await res.json();
          if (data.success) {
            setModalGroups(data.data);
          }
        } catch (err) {
          console.error('Error fetching groups in modal:', err);
        } finally {
          setLoadingModalGroups(false);
        }
      };
      fetchModalGroups();
    }
  }, [showGroupsModal]);

  const handleSendNexoMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nexoInput.trim()) return;

    const userMsg = nexoInput.trim();
    setNexoInput('');
    setNexoMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: userMsg }]);
    setNexoLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/nexo/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id || 'cf7c92fe-efc5-483b-b195-46c515bf6d43', 
          message: userMsg 
        })
      });

      const data = await res.json();
      if (res.status === 429 || data.action === 'UPGRADE_REQUIRED') {
        setNexoMessages(prev => [...prev, { id: Date.now(), sender: 'nexo', text: data.message }]);
      } else if (data.success) {
        setNexoMessages(prev => [...prev, { id: Date.now(), sender: 'nexo', text: data.data.reply }]);
      } else {
        setNexoMessages(prev => [...prev, { id: Date.now(), sender: 'nexo', text: 'Tuvimos un problema al responder. Inténtalo de nuevo.' }]);
      }
    } catch (err) {
      setNexoMessages(prev => [...prev, { id: Date.now(), sender: 'nexo', text: 'Error al conectar con Nexo AI.' }]);
    } finally {
      setNexoLoading(false);
    }
  };

  const contacts = [
    { id: '1', name: 'Meta AI', avatar: 'https://ui-avatars.com/api/?name=Meta+AI&background=6200ea&color=fff', isAI: true, verified: true },
    { id: '2', name: 'Jerson Camilo Umbarila Hincapie', avatar: 'https://ui-avatars.com/api/?name=Jerson+Camilo&background=00838f&color=fff' },
    { id: '3', name: 'Alejandra Colmenares', avatar: 'https://ui-avatars.com/api/?name=Alejandra&background=c2185b&color=fff' },
    { id: '4', name: 'Camila Uzuga', avatar: 'https://ui-avatars.com/api/?name=Camila&background=e65100&color=fff' },
    { id: '5', name: 'Mi Papito', avatar: 'https://ui-avatars.com/api/?name=Mi+Papito&background=455a64&color=fff' },
    { id: '6', name: 'Maria Sanchez', avatar: 'https://ui-avatars.com/api/?name=Maria&background=ad1457&color=fff' },
    { id: '7', name: 'Valentina Gavilán', avatar: 'https://ui-avatars.com/api/?name=Valentina&background=00695c&color=fff' },
    { id: '8', name: 'Francia Pérez', avatar: 'https://ui-avatars.com/api/?name=Francia&background=37474f&color=fff' },
    { id: '9', name: 'Melany Espinoza', avatar: 'https://ui-avatars.com/api/?name=Melany&background=d84315&color=fff' },
    { id: '10', name: 'Axel Daniel Villegas', avatar: 'https://ui-avatars.com/api/?name=Axel&background=1565c0&color=fff' }
  ];

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      try {
        setUser(JSON.parse(u));
      } catch (e) {
        console.error('Error parsing user', e);
      }
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchUserFriends();
      fetchUserConversations();
    }
  }, [user]);

  const fetchUserFriends = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/friends/list/${user.id}`);
      const data = await res.json();
      if (data.success) {
        setUserFriends(data.data);
      }
    } catch (err) {
      console.error('Error fetching friends:', err);
    }
  };

  const fetchUserConversations = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/messaging/user/${user.id}`);
      const data = await res.json();
      if (data.success) {
        setConversations(data.data);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/search/global?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data.users || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchUsers(searchContact), 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchContact, searchUsers]);

  const handleConfirmRequest = (id: string) => {
    setFriendRequests(prev => prev.filter(req => req.id !== id));
  };

  const handleDeleteRequest = (id: string) => {
    setFriendRequests(prev => prev.filter(req => req.id !== id));
  };

  const handleCreateGroup = async () => {
    if (!user?.id || !groupName.trim() || selectedParticipants.length === 0) return;

    try {
      const allParticipants = [...selectedParticipants, user.id];
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/messaging/group/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user.id,
          name: groupName,
          participantIds: allParticipants,
          avatar: groupAvatar || undefined,
          theme: selectedTheme
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setShowGroupModal(false);
        setGroupName('');
        setGroupAvatar('');
        setSelectedParticipants([]);
        fetchUserConversations();
        window.location.href = `/dashboard/chat/${data.data.id}`;
      } else {
        console.error('Error creating group:', data.message);
      }
    } catch (err) {
      console.error('Error creating group:', err);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    if (!user?.id) return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, friendId })
      });
      
      const data = await res.json();
      if (data.success) {
        setSearchContact('');
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Error sending friend request:', err);
    }
  };

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchContact.toLowerCase())
  );

  const leftNavItems = [
    { label: 'Nexo AI', icon: <Sparkles size={20} className="icon-glow" />, href: '#', color: '#00E5FF', action: () => setShowNexoModal(true) },
    { label: 'Amigos', icon: <Users size={20} />, href: '#', color: '#00E5FF', action: () => setShowFriendsModal(true) },
    { label: 'Recuerdos', icon: <History size={20} />, href: '#', color: '#ffa500', action: () => setShowMemoriesModal(true) },
    { label: 'Guardado', icon: <Bookmark size={20} />, href: '#', color: '#4CAF50', action: () => setShowSavedModal(true) },
    { label: 'Logros y Medallas', icon: <Award size={20} />, href: '#', color: '#FFD700', action: () => setShowLogrosModal(true) },
    { label: 'Grupos temáticos', icon: <Compass size={20} />, href: '#', color: '#9C27B0', action: () => setShowGroupsModal(true) }
  ];

  const shortcuts = [
    { name: 'VALORANT - LATAM', image: 'https://ui-avatars.com/api/?name=VAL&background=f44336&color=fff' },
    { name: 'VALORANT Colombia', image: 'https://ui-avatars.com/api/?name=COL&background=3f51b5&color=fff' },
    { name: 'HailSylvie Community', image: 'https://ui-avatars.com/api/?name=HAIL&background=e91e63&color=fff' },
    { name: 'Valorant COMPETITIVO LATAM', image: 'https://ui-avatars.com/api/?name=COMP&background=009688&color=fff' }
  ];

  return (
    <div className="community-page">
      <div className="fb-layout-container">
        
        {/* Columna Izquierda (Navegación & Accesos Directos) */}
        <aside className="left-sidebar" data-tour="community-left-sidebar">
          <div className="sidebar-scrollable">
            <Link href={`/dashboard/profile/${user?.username || ''}`} className="sidebar-link profile-item">
              <img 
                src={user?.avatarUrl || 'https://ui-avatars.com/api/?name=User'} 
                alt={user?.username} 
                className="user-avatar"
              />
              <span className="link-label">{user?.username || 'Mi Perfil'}</span>
            </Link>

            {leftNavItems.map((item, idx) => (
              item.action ? (
                <button key={idx} className="sidebar-link" onClick={item.action}>
                  <span className="icon-wrapper" style={{ color: item.color || 'var(--color-primary)' }}>
                    {item.icon}
                  </span>
                  <span className="link-label">{item.label}</span>
                </button>
              ) : (
                <Link key={idx} href={item.href} className="sidebar-link">
                  <span className="icon-wrapper" style={{ color: item.color || 'var(--color-primary)' }}>
                    {item.icon}
                  </span>
                  <span className="link-label">{item.label}</span>
                </Link>
              )
            ))}

            <button className="sidebar-link show-more" onClick={() => setShowAllLeftItems(!showAllLeftItems)}>
              <span className="icon-wrapper">
                <ChevronDown size={20} style={{ transform: showAllLeftItems ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
              </span>
              <span className="link-label">{showAllLeftItems ? 'Ver menos' : 'Ver más'}</span>
            </button>

            <div className="sidebar-divider" />

            <div className="shortcuts-section">
              <div className="section-header">
                <h3>Tus accesos directos</h3>
              </div>

              {shortcuts.map((shortcut, idx) => (
                <Link key={idx} href="#" className="sidebar-link shortcut-item">
                  <img src={shortcut.image} alt={shortcut.name} className="shortcut-img" />
                  <span className="link-label">{shortcut.name}</span>
                </Link>
              ))}
            </div>

            <footer className="sidebar-footer">
              <p>Privacidad • Condiciones • Publicidad • Opciones de anuncios • Cookies • Más • Meta © 2026</p>
            </footer>
          </div>
        </aside>

        {/* Columna Central (Feed Principal) */}
        <main className="center-feed" data-tour="community-feed">
          <FeedList />
        </main>

        {/* Columna Derecha (Contactos & Actividades) */}
        <aside className="right-sidebar" data-tour="community-right-sidebar">
          <div className="sidebar-scrollable">
            
            {/* Solicitudes de amistad */}
            {friendRequests.length > 0 && (
              <div className="right-section friend-requests">
                <div className="section-header">
                  <h3>Solicitudes de amistad</h3>
                  <button className="header-action-btn">Ver todo</button>
                </div>

                <div className="requests-list">
                  {friendRequests.map(req => (
                    <div key={req.id} className="request-card">
                      <img src={req.avatar} alt={req.name} className="request-avatar" />
                      <div className="request-info">
                        <div className="request-header">
                          <span className="request-name">{req.name}</span>
                          <span className="request-time">{req.time}</span>
                        </div>
                        <span className="request-subtitle">{req.mutual}</span>
                        <div className="request-actions">
                          <button 
                            className="btn-confirm" 
                            onClick={() => handleConfirmRequest(req.id)}
                          >
                            Confirmar
                          </button>
                          <button 
                            className="btn-delete" 
                            onClick={() => handleDeleteRequest(req.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="sidebar-divider" />
              </div>
            )}

            {/* Cumpleaños */}
            <div className="right-section birthdays">
              <div className="section-header">
                <h3>Cumpleaños</h3>
              </div>
              <div className="birthday-card">
                <Gift size={28} className="gift-icon" />
                <p className="birthday-text">
                  Hoy es el cumpleaños de <strong>Sofía Castro</strong> y otro contacto.
                </p>
              </div>
              <div className="sidebar-divider" />
            </div>

            {/* Contactos */}
            <div className="right-section contacts">
              <div className="section-header">
                <h3>Contactos</h3>
                <div className="header-icons">
                  <div className="contact-search-box">
                    <Search size={16} className="search-icon-inside" />
                    <input 
                      type="text" 
                      placeholder="Buscar contacto..." 
                      value={searchContact}
                      onChange={(e) => setSearchContact(e.target.value)}
                    />
                  </div>
                  <button className="icon-btn"><MoreHorizontal size={18} /></button>
                </div>
              </div>

<div className="contacts-list">
                {searchContact.length > 0 ? (
                  searchResults.length > 0 ? (
                    searchResults.map(u => (
                      <div key={u.id} className="contact-item">
                        <Link href={`/dashboard/profile/${u.username}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                          <div className="avatar-wrapper">
                            <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}`} alt={u.username} className="contact-avatar" />
                            <span className="online-badge" />
                          </div>
                          <span className="contact-name">
                            @{u.username}
                            {u.isPremium && <span className="premium-badge">★</span>}
                          </span>
                        </Link>
                        <button 
                          className="add-friend-btn"
                          onClick={() => sendFriendRequest(u.id)}
                          aria-label="Agregar amigo"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    ))
                  ) : !searching ? (
                    <p className="no-contacts">No se encontraron usuarios</p>
                  ) : (
                    <p className="no-contacts">Buscando...</p>
                  )
                ) : (
                  <p className="no-contacts">Escribe para buscar usuarios</p>
                )}
              </div>
            </div>

{/* Chats en grupo */}
             <div className="right-section group-chats">
               <div className="section-header">
                 <h3>Chats en grupo</h3>
               </div>
               <button className="btn-create-group" onClick={() => setShowGroupModal(true)}>
                 <Plus size={20} />
                 <span>Crear chat en grupo</span>
               </button>
             </div>

             {/* Chat Bubble Flotante */}
             <button className="chat-bubble-btn" onClick={() => setShowChatBubble(!showChatBubble)}>
               <MessageCircle size={24} />
               {conversations.filter((c: any) => c.messages?.[0] && !c.messages[0].isRead).length > 0 && (
                 <span className="chat-badge">
                   {conversations.filter((c: any) => c.messages?.[0] && !c.messages[0].isRead).length}
                 </span>
               )}
             </button>

             {showChatBubble && (
               <div className="chat-bubble-popup" onClick={(e) => e.stopPropagation()}>
                 <div className="chat-bubble-header">
                   <h4>Mensajes</h4>
                   <button onClick={() => setShowChatBubble(false)}>
                     <X size={18} />
                   </button>
                 </div>
                 <div className="chat-bubble-list">
                   {conversations.length > 0 ? (
                     conversations.map((conv: any) => (
                       <Link href={`/dashboard/chat/${conv.id}`} key={conv.id} className="chat-bubble-item">
                         <div className="chat-bubble-avatar" style={{ background: conv.avatar ? undefined : conv.theme || '#00E5FF' }}>
                           {conv.avatar ? (
                             <img src={conv.avatar} alt={conv.name} />
                           ) : (
                             <span>{conv.name?.charAt(0) || 'G'}</span>
                           )}
                         </div>
                         <div className="chat-bubble-info">
                           <span className="chat-bubble-name">{conv.name || (conv.isGroup ? 'Grupo' : 'Chat')}</span>
                           <span className="chat-bubble-preview">
                             {conv.messages?.[0]?.content?.substring(0, 30) || 'Sin mensajes'}...
                           </span>
                         </div>
                         {!conv.messages?.[0]?.isRead && <span className="chat-unread-dot" />}
                       </Link>
                     ))
                   ) : (
                     <p className="no-chats">No tienes conversaciones</p>
                   )}
                 </div>
               </div>
             )}
           </div>
         </aside>
      </div>

      {/* Modal para crear grupo */}
      {showGroupModal && (
        <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="modal-content group-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowGroupModal(false)}>
              <X size={20} />
            </button>
            <h3>Crear grupo</h3>
            
            <div className="group-avatar-section">
              <div className="group-avatar-preview" style={{ background: selectedTheme }}>
                {groupAvatar ? (
                  <img src={groupAvatar} alt="Grupo" />
                ) : (
                  <Camera size={32} />
                )}
              </div>
              <div className="group-theme-picker">
                <Palette size={16} />
                <div className="theme-options">
                  {groupThemes.map((theme) => (
                    <button
                      key={theme.name}
                      className={`theme-option ${selectedTheme === theme.gradient ? 'selected' : ''}`}
                      style={{ background: theme.gradient }}
                      onClick={() => setSelectedTheme(theme.gradient)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <input
              type="text"
              placeholder="Nombre del grupo"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="modal-input"
            />
            
            <input
              type="url"
              placeholder="URL del avatar (opcional)"
              value={groupAvatar}
              onChange={(e) => setGroupAvatar(e.target.value)}
              className="modal-input"
            />

            <div className="modal-section">
              <h4>Agregar participantes</h4>
              <div className="participants-list">
                {userFriends.length > 0 ? (
                  userFriends.map((friend: any) => (
                    <label key={friend.id} className="participant-item">
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(friend.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedParticipants([...selectedParticipants, friend.id]);
                          } else {
                            setSelectedParticipants(selectedParticipants.filter(id => id !== friend.id));
                          }
                        }}
                      />
                      <img src={friend.avatarUrl || `https://ui-avatars.com/api/?name=${friend.username}`} alt={friend.username} />
                      <span>@{friend.username}</span>
                    </label>
                  ))
                ) : (
                  <p className="no-friends">Busca usuarios y agrega amigos para incluirlos en el grupo</p>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowGroupModal(false)} className="btn-modal-cancel">Cancelar</button>
              <button 
                onClick={handleCreateGroup} 
                className="btn-modal-create"
                disabled={!groupName.trim() || selectedParticipants.length === 0}
              >
                Crear grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales de Amigos, Guardado y Recuerdos */}
      {showFriendsModal && user && (
        <FriendsModal
          userId={user.id}
          onClose={() => setShowFriendsModal(false)}
          currentUser={user}
        />
      )}
      {showSavedModal && user && (
        <SavedPostsModal
          userId={user.id}
          onClose={() => setShowSavedModal(false)}
        />
      )}
      {showMemoriesModal && user && (
        <MemoriesModal
          userId={user.id}
          onClose={() => setShowMemoriesModal(false)}
        />
      )}

      {/* Modal de Nexo AI */}
      {showNexoModal && (
        <div className="modal-overlay" onClick={() => setShowNexoModal(false)}>
          <div className="modal-content nexo-ai-modal" onClick={(e) => e.stopPropagation()} style={{ width: '500px', display: 'flex', flexDirection: 'column', height: '600px' }}>
            <button className="modal-close" onClick={() => setShowNexoModal(false)}>
              <X size={20} />
            </button>
            <h3>Nexo AI - Asistente Otaku</h3>
            <div className="nexo-chat-messages" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', margin: '15px 0', paddingRight: '5px' }}>
              {nexoMessages.map((msg) => (
                <div key={msg.id} style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, #0052FF, #00E5FF)' : 'rgba(255, 255, 255, 0.05)',
                  border: msg.sender === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '10px 14px',
                  borderRadius: '16px',
                  borderBottomRightRadius: msg.sender === 'user' ? '0' : '16px',
                  borderBottomLeftRadius: msg.sender === 'nexo' ? '0' : '16px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  lineHeight: '1.4'
                }}>
                  {msg.text}
                </div>
              ))}
              {nexoLoading && (
                <div style={{ alignSelf: 'flex-start', color: '#00E5FF', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="nexo-pulse-dot" /> Nexo está pensando...
                </div>
              )}
            </div>
            <form onSubmit={handleSendNexoMessage} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Pregúntale algo a Nexo..."
                value={nexoInput}
                onChange={(e) => setNexoInput(e.target.value)}
                className="modal-input"
                disabled={nexoLoading}
                style={{ margin: 0, flex: 1 }}
              />
              <button type="submit" className="btn-modal-create" disabled={nexoLoading} style={{ width: '80px', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Enviar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Logros y Medallas */}
      {showLogrosModal && (
        <div className="modal-overlay" onClick={() => setShowLogrosModal(false)}>
          <div className="modal-content logros-modal" onClick={(e) => e.stopPropagation()} style={{ width: '480px', maxHeight: '550px', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => setShowLogrosModal(false)}>
              <X size={20} />
            </button>
            <h3>Logros y Medallas</h3>
            <p style={{ fontSize: '0.9rem', color: '#777', marginBottom: '20px' }}>
              Completa desafíos de AniNexo para desbloquear medallas exclusivas y subir en los rankings.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { title: 'Otaku en Crecimiento', desc: 'Completa la información de tu perfil', progress: 100, completed: true, color: '#00E5FF', icon: <Sparkles size={24} /> },
                { title: 'Primer Nexo', desc: 'Crea tu primera publicación en el feed', progress: 100, completed: true, color: '#4CAF50', icon: <Users size={24} /> },
                { title: 'Crítico de Anime', desc: 'Comenta en 5 publicaciones ajenas', progress: 60, completed: false, color: '#FFD700', icon: <Award size={24} /> },
                { title: 'Espíritu Social', desc: 'Envía 3 solicitudes de amistad', progress: 33, completed: false, color: '#ffa500', icon: <Compass size={24} /> },
                { title: 'Coleccionista', desc: 'Guarda 10 publicaciones de otros', progress: 10, completed: false, color: '#9C27B0', icon: <Bookmark size={24} /> }
              ].map((logro, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  padding: '12px 16px',
                  borderRadius: '16px',
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: logro.completed ? `linear-gradient(135deg, rgba(0, 0, 0, 0.3), ${logro.color}33)` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${logro.completed ? logro.color : 'rgba(255, 255, 255, 0.07)'}`,
                    color: logro.completed ? logro.color : '#444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {logro.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: logro.completed ? '#fff' : '#aaa', fontWeight: 600 }}>{logro.title}</h4>
                      <span style={{ fontSize: '0.8rem', color: logro.completed ? logro.color : '#777', fontWeight: 600 }}>
                        {logro.completed ? 'Completado' : `${logro.progress}%`}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#777', marginBottom: '8px' }}>{logro.desc}</p>
                    <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${logro.progress}%`, height: '100%', background: logro.completed ? `linear-gradient(90deg, #0052FF, ${logro.color})` : logro.color, borderRadius: '3px' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Grupos Temáticos */}
      {showGroupsModal && (
        <div className="modal-overlay" onClick={() => setShowGroupsModal(false)}>
          <div className="modal-content groups-modal" onClick={(e) => e.stopPropagation()} style={{ width: '500px', maxHeight: '550px', display: 'flex', flexDirection: 'column' }}>
            <button className="modal-close" onClick={() => setShowGroupsModal(false)}>
              <X size={20} />
            </button>
            <h3>Grupos Temáticos</h3>
            <p style={{ fontSize: '0.88rem', color: '#777', marginBottom: '15px' }}>
              Explora y únete a comunidades temáticas dedicadas a tus series favoritas.
            </p>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '5px' }}>
              {loadingModalGroups ? (
                <p style={{ color: '#00E5FF', fontSize: '0.9rem', textAlign: 'center', margin: '20px 0' }}>Cargando grupos...</p>
              ) : modalGroups.length > 0 ? (
                modalGroups.map((group) => (
                  <div key={group.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: '12px 16px',
                    borderRadius: '16px',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '45px',
                        height: '45px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0052FF, #00E5FF)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem',
                        color: '#fff',
                        fontWeight: 700,
                        overflow: 'hidden'
                      }}>
                        {group.coverImage ? (
                          <img src={group.coverImage} alt={group.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span>{group.name.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#fff', fontWeight: 600 }}>{group.name}</h4>
                        <span style={{ fontSize: '0.78rem', color: '#777' }}>
                          {group._count?.members || 1} miembros
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn-modal-create"
                      style={{ width: 'auto', padding: '6px 14px', fontSize: '0.8rem', borderRadius: '10px', height: 'auto', margin: 0 }}
                      onClick={() => {
                        alert(`¡Te has unido al grupo ${group.name}!`);
                      }}
                    >
                      Unirse
                    </button>
                  </div>
                ))
              ) : (
                <p style={{ color: '#777', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>No hay grupos creados aún.</p>
              )}
            </div>
            
            <button
              className="btn-modal-create"
              style={{ marginTop: '15px' }}
              onClick={() => {
                setShowGroupsModal(false);
                setShowGroupModal(true);
              }}
            >
              + Crear Nuevo Grupo
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .community-page {
          background: radial-gradient(ellipse at 20% 0%, rgba(0,82,255,0.06) 0%, transparent 60%),
                      radial-gradient(ellipse at 80% 100%, rgba(0,229,255,0.04) 0%, transparent 60%),
                      transparent;
          color: #f0f2f5;
          min-height: 100vh;
          width: 100%;
          font-family: var(--font-whyte-inktrap), 'Inter', sans-serif;
        }

        .fb-layout-container {
          display: grid;
          grid-template-columns: 320px 1fr 320px;
          height: calc(100vh - 70px);
          max-width: 1920px;
          margin: 0 auto;
        }

        /* ── Sidebars ── */
        .left-sidebar, .right-sidebar {
          height: 100%;
          overflow: hidden;
          position: sticky;
          top: 70px;
          border-right: 1px solid rgba(255,255,255,0.04);
        }
        .right-sidebar {
          border-right: none;
          border-left: 1px solid rgba(255,255,255,0.04);
        }

        .sidebar-scrollable {
          height: 100%;
          overflow-y: auto;
          padding: 16px 10px 40px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .sidebar-scrollable::-webkit-scrollbar { width: 4px; }
        .sidebar-scrollable::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scrollable::-webkit-scrollbar-thumb { background: rgba(0,229,255,0.12); border-radius: 4px; }

        /* ── Sidebar Links ── */
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 11px 14px;
          border-radius: 14px;
          color: #b0b8c8;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.93rem;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid transparent;
          background: transparent;
          width: 100%;
          text-align: left;
          cursor: pointer;
          position: relative;
        }

        .sidebar-link:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.06);
          transform: translateX(4px);
        }

        .profile-item {
          background: linear-gradient(135deg, rgba(0,82,255,0.1), rgba(0,229,255,0.05));
          border: 1px solid rgba(0, 229, 255, 0.15) !important;
          margin-bottom: 8px;
          padding: 12px 14px;
          border-radius: 16px !important;
        }
        .profile-item:hover {
          background: linear-gradient(135deg, rgba(0,82,255,0.18), rgba(0,229,255,0.09)) !important;
          border-color: rgba(0,229,255,0.3) !important;
          transform: none !important;
          box-shadow: 0 4px 20px rgba(0,82,255,0.15);
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(0, 229, 255, 0.5);
          box-shadow: 0 0 14px rgba(0, 229, 255, 0.25);
          flex-shrink: 0;
        }

        .icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          transition: all 0.22s;
          flex-shrink: 0;
        }
        .sidebar-link:hover .icon-wrapper {
          background: rgba(0, 229, 255, 0.1);
          box-shadow: 0 0 16px rgba(0, 229, 255, 0.2);
          transform: scale(1.08);
        }

        .icon-glow { filter: drop-shadow(0 0 7px #00E5FF); }

        .link-label {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 500;
        }

        .sidebar-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,229,255,0.12), transparent);
          margin: 10px 12px;
        }

        /* ── Section headers ── */
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px 6px;
        }
        .section-header h3 {
          font-size: 0.73rem;
          font-weight: 700;
          color: #404860;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .header-action-btn {
          background: none;
          border: none;
          color: #0099cc;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          border-radius: 6px;
          padding: 3px 8px;
          transition: all 0.2s;
        }
        .header-action-btn:hover {
          background: rgba(0,229,255,0.08);
          color: #00E5FF;
        }

        /* ── Shortcuts ── */
        .shortcuts-section { margin-top: 6px; }
        .shortcut-img {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          object-fit: cover;
          border: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }

        .sidebar-footer {
          padding: 20px 12px 8px;
          font-size: 0.7rem;
          color: #2a2a2a;
          line-height: 1.6;
          margin-top: auto;
        }

        /* ── Center Feed ── */
        .center-feed {
          padding: 0;
          overflow-y: auto;
          scrollbar-width: none;
          background: transparent;
        }
        .center-feed::-webkit-scrollbar { display: none; }

        /* ── Right Sidebar Sections ── */
        .right-section {
          display: flex;
          flex-direction: column;
          margin-bottom: 18px;
        }

        /* Friend Requests */
        .requests-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 0 8px;
        }
        .request-card {
          display: flex;
          gap: 12px;
          padding: 14px;
          border-radius: 16px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          transition: all 0.25s;
        }
        .request-card:hover {
          background: rgba(0,229,255,0.04);
          border-color: rgba(0,229,255,0.12);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }
        .request-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(0,229,255,0.2);
          flex-shrink: 0;
        }
        .request-info { flex: 1; display: flex; flex-direction: column; }
        .request-header { display: flex; justify-content: space-between; align-items: baseline; }
        .request-name { font-weight: 700; color: #fff; font-size: 0.9rem; }
        .request-time { font-size: 0.7rem; color: #444; }
        .request-subtitle { font-size: 0.77rem; color: #666; margin: 3px 0 10px; }
        .request-actions { display: flex; gap: 8px; }
        .request-actions button {
          flex: 1;
          padding: 8px 12px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
          border: none;
          transition: all 0.22s;
        }
        .btn-confirm {
          background: linear-gradient(135deg, #0052FF, #00E5FF);
          color: white;
        }
        .btn-confirm:hover {
          box-shadow: 0 0 16px rgba(0,229,255,0.4);
          transform: scale(1.03);
        }
        .btn-delete {
          background: rgba(255,255,255,0.06);
          color: #999;
          border: 1px solid rgba(255,255,255,0.07) !important;
        }
        .btn-delete:hover { background: rgba(255,255,255,0.1); color: white; }

        /* Birthday */
        .birthday-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 13px 16px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(255,179,0,0.07), rgba(255,100,0,0.03));
          border: 1px solid rgba(255,179,0,0.14);
          margin: 0 8px;
          transition: all 0.25s;
        }
        .birthday-card:hover {
          border-color: rgba(255,179,0,0.28);
          box-shadow: 0 0 20px rgba(255,179,0,0.08);
          transform: translateY(-1px);
        }
        .gift-icon {
          color: #ffb300;
          filter: drop-shadow(0 0 7px rgba(255,179,0,0.45));
          flex-shrink: 0;
        }
        .birthday-text { font-size: 0.82rem; color: #bbb; line-height: 1.45; margin: 0; }

        /* Contacts */
        .header-icons { display: flex; align-items: center; gap: 8px; }
        .contact-search-box { position: relative; display: flex; align-items: center; }
        .contact-search-box input {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 5px 10px 5px 28px;
          color: white;
          font-size: 0.78rem;
          width: 120px;
          outline: none;
          transition: all 0.3s;
        }
        .contact-search-box input:focus {
          width: 155px;
          border-color: rgba(0,229,255,0.35);
          background: rgba(0,229,255,0.04);
          box-shadow: 0 0 12px rgba(0,229,255,0.1);
        }
        .search-icon-inside { position: absolute; left: 8px; color: #444; }
        .icon-btn {
          background: transparent;
          border: none;
          color: #555;
          cursor: pointer;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .icon-btn:hover { background: rgba(255,255,255,0.06); color: #00E5FF; }

        .contacts-list { display: flex; flex-direction: column; gap: 2px; padding: 0 4px; }
        .contact-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .contact-item:hover { background: rgba(0,229,255,0.05); }

        .avatar-wrapper { position: relative; flex-shrink: 0; }
        .contact-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid rgba(255,255,255,0.07);
        }
        .online-badge {
          position: absolute;
          bottom: 1px;
          right: 1px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #22c55e;
          border: 2px solid #080810;
          box-shadow: 0 0 8px rgba(34,197,94,0.6);
        }
        .contact-name {
          font-size: 0.87rem;
          font-weight: 500;
          color: #c8ccd4;
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .verified-badge { color: #00E5FF; font-size: 0.72rem; }
        .premium-badge { color: #FFD700; font-size: 0.72rem; filter: drop-shadow(0 0 4px rgba(255,215,0,0.4)); }
        .no-contacts { font-size: 0.8rem; color: #404040; text-align: center; padding: 18px 10px; }

        /* Group Chats */
        .btn-create-group {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 15px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(0,82,255,0.1), rgba(0,229,255,0.05));
          border: 1px solid rgba(0,229,255,0.12);
          color: #00E5FF;
          font-weight: 600;
          font-size: 0.87rem;
          cursor: pointer;
          transition: all 0.25s;
          margin: 0 8px;
          width: calc(100% - 16px);
        }
        .btn-create-group:hover {
          background: linear-gradient(135deg, rgba(0,82,255,0.18), rgba(0,229,255,0.12));
          border-color: rgba(0,229,255,0.3);
          box-shadow: 0 0 16px rgba(0,229,255,0.18);
          transform: translateY(-2px);
        }

        /* Chat Bubble */
        .chat-bubble-btn {
          position: fixed;
          bottom: 28px;
          right: 28px;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0052FF, #00E5FF);
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 24px rgba(0,82,255,0.45);
          z-index: 100;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          animation: chat-pulse 3s ease-in-out infinite;
        }
        @keyframes chat-pulse {
          0%, 100% { box-shadow: 0 4px 24px rgba(0,82,255,0.45), 0 0 0 0 rgba(0,229,255,0.3); }
          50% { box-shadow: 0 4px 24px rgba(0,82,255,0.45), 0 0 0 14px rgba(0,229,255,0); }
        }
        .chat-bubble-btn:hover {
          transform: scale(1.12) translateY(-3px);
          box-shadow: 0 10px 32px rgba(0,82,255,0.6), 0 0 24px rgba(0,229,255,0.3);
        }
        .chat-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          background: #ef4444;
          color: white;
          font-size: 0.67rem;
          font-weight: 700;
          min-width: 20px;
          height: 20px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #080810;
        }

        /* Chat Popup */
        .chat-bubble-popup {
          position: fixed;
          bottom: 96px;
          right: 28px;
          width: 340px;
          max-height: 430px;
          background: rgba(10, 10, 18, 0.96);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(0,229,255,0.14);
          border-radius: 20px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,82,255,0.08);
          z-index: 100;
          display: flex;
          flex-direction: column;
          animation: popup-in 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes popup-in {
          from { opacity: 0; transform: scale(0.88) translateY(14px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .chat-bubble-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .chat-bubble-header h4 {
          margin: 0;
          font-size: 1rem;
          font-weight: 700;
          background: linear-gradient(90deg, #fff, #00E5FF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .chat-bubble-header button {
          background: rgba(255,255,255,0.06);
          border: none;
          color: #666;
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          transition: all 0.2s;
        }
        .chat-bubble-header button:hover { background: rgba(255,255,255,0.1); color: white; }
        .chat-bubble-list { padding: 8px; overflow-y: auto; max-height: 370px; }
        .chat-bubble-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          text-decoration: none;
          color: inherit;
          position: relative;
          transition: all 0.2s;
        }
        .chat-bubble-item:hover { background: rgba(0,229,255,0.05); }
        .chat-bubble-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          border: 2px solid rgba(0,229,255,0.15);
        }
        .chat-bubble-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .chat-bubble-avatar span { color: white; font-weight: 700; font-size: 1.1rem; }
        .chat-bubble-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .chat-bubble-name { font-weight: 600; color: #e4e6eb; font-size: 0.88rem; }
        .chat-bubble-preview { font-size: 0.77rem; color: #444; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .chat-unread-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0052FF, #00E5FF);
          flex-shrink: 0;
          box-shadow: 0 0 8px rgba(0,229,255,0.6);
        }
        .no-chats { font-size: 0.8rem; color: #333; text-align: center; padding: 28px; }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          animation: fade-in 0.2s ease;
        }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .modal-content {
          background: rgba(10, 10, 18, 0.98);
          backdrop-filter: blur(40px);
          border: 1px solid rgba(0,229,255,0.15);
          border-radius: 22px;
          padding: 30px;
          position: relative;
          box-shadow: 0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(0,82,255,0.1);
          animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.88) translateY(24px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255,255,255,0.06);
          border: none;
          color: #777;
          cursor: pointer;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .modal-close:hover { background: rgba(255,255,255,0.1); color: white; }
        .modal-content h3 {
          margin: 0 0 22px;
          font-size: 1.25rem;
          font-weight: 800;
          background: linear-gradient(90deg, #ffffff, #00E5FF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .group-modal { width: 440px; }
        .group-avatar-section { display: flex; gap: 18px; align-items: center; margin-bottom: 18px; }
        .group-avatar-preview {
          width: 86px;
          height: 86px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          box-shadow: 0 0 24px rgba(0,229,255,0.25);
          border: 2px solid rgba(0,229,255,0.25);
        }
        .group-avatar-preview img { width: 100%; height: 100%; object-fit: cover; }
        .group-theme-picker { display: flex; flex-direction: column; gap: 10px; }
        .group-theme-picker svg { color: #555; }
        .theme-options { display: flex; gap: 8px; flex-wrap: wrap; }
        .theme-option { width: 30px; height: 30px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: all 0.2s; }
        .theme-option:hover { transform: scale(1.18); }
        .theme-option.selected { border-color: white; box-shadow: 0 0 12px rgba(255,255,255,0.3); transform: scale(1.12); }
        .modal-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 13px;
          padding: 12px 15px;
          color: white;
          font-size: 0.9rem;
          outline: none;
          margin-bottom: 12px;
          box-sizing: border-box;
          transition: all 0.22s;
        }
        .modal-input:focus {
          border-color: rgba(0,229,255,0.4);
          background: rgba(0,229,255,0.04);
          box-shadow: 0 0 14px rgba(0,229,255,0.1);
        }
        .modal-input::placeholder { color: #333; }
        .modal-section h4 {
          margin: 0 0 10px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #444;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .participants-list { display: flex; flex-direction: column; gap: 4px; max-height: 160px; overflow-y: auto; }
        .participant-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .participant-item:hover { background: rgba(0,229,255,0.04); }
        .participant-item input[type="checkbox"] { accent-color: #00E5FF; width: 16px; height: 16px; }
        .participant-item img { width: 30px; height: 30px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.08); }
        .no-friends { font-size: 0.8rem; color: #3a3a3a; text-align: center; padding: 18px; }
        .modal-actions { display: flex; gap: 10px; margin-top: 18px; }
        .btn-modal-cancel {
          flex: 1;
          padding: 12px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.04);
          color: #777;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-modal-cancel:hover { background: rgba(255,255,255,0.08); color: white; }
        .btn-modal-create {
          flex: 2;
          padding: 12px;
          border-radius: 13px;
          border: none;
          background: linear-gradient(135deg, #0052FF, #00E5FF);
          color: white;
          font-weight: 700;
          cursor: pointer;
          font-size: 0.92rem;
          transition: all 0.25s;
        }
        .btn-modal-create:hover:not(:disabled) {
          box-shadow: 0 0 22px rgba(0,229,255,0.45);
          transform: translateY(-2px);
        }
        .btn-modal-create:disabled { opacity: 0.3; cursor: not-allowed; }

        .add-friend-btn {
          background: rgba(0,229,255,0.07);
          border: 1px solid rgba(0,229,255,0.14);
          color: #00E5FF;
          cursor: pointer;
          padding: 7px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .add-friend-btn:hover {
          background: rgba(0,229,255,0.16);
          box-shadow: 0 0 12px rgba(0,229,255,0.25);
          transform: scale(1.1);
        }

        .show-more { color: #404040; font-size: 0.87rem; }
        .show-more:hover { color: #00E5FF; background: rgba(0,229,255,0.04) !important; }

        /* Responsive */
        @media (max-width: 1400px) {
          .fb-layout-container { grid-template-columns: 260px 1fr 260px; }
        }
        @media (max-width: 1200px) {
          .fb-layout-container { grid-template-columns: 230px 1fr; }
          .right-sidebar { display: none; }
        }
        @media (max-width: 768px) {
          .fb-layout-container { grid-template-columns: 1fr; }
          .left-sidebar { display: none; }
        }
      `}</style>
    </div>
  );
}
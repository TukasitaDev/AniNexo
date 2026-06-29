'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card } from '../ui/Card/Card';
import { translateListStatus } from '../../lib/translations';
import { OnboardingWizard } from '../auth/OnboardingWizard';
import { EditProfileModal } from './EditProfileModal';
import { CreatePost } from '../feed/CreatePost';
import { PostItem } from '../feed/PostItem';
import { UserListModal } from './UserListModal';
import { ChatModal } from './ChatModal';
import { useSocket } from '../../hooks/useSocket';
import styles from './ProfileView.module.css';interface ProfileViewProps {
  profile: any;
  animeList: any[];
  collection?: any[];
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile: initialProfile, animeList, collection: initialCollection = [] }) => {
  const [profile, setProfile] = React.useState(initialProfile);
  const [showProfiling, setShowProfiling] = useState(false);
  const [stories, setStories] = useState<any[]>([]);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<any>(null);
  const [isUploadingStory, setIsUploadingStory] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const { socket, isConnected } = useSocket(conversationId || undefined);
  const themeColor = profile.themeColor || '#FF007F'; // Magenta Social por defecto

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStories = async () => {
    try {
      if (!currentUser?.id) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/social/stories?userId=${currentUser.id}`);
      const data = await res.json();
      if (data.success) setStories(data.data);
    } catch (e) {
      console.error('Error fetching stories:', e);
    }
  };

  const fetchUserPosts = async () => {
    try {
      setLoadingPosts(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/feed/user/${profile.id}`);
      const data = await res.json();
      if (data.success) setPosts(data.data);
    } catch (e) { console.error(e); }
    finally { setLoadingPosts(false); }
  };

  useEffect(() => {
    if (profile.id) fetchUserPosts();
  }, [profile.id]);

  useEffect(() => {
    const loadUser = async () => {
      const u = localStorage.getItem('user');
      if (u) {
        try {
          const parsed = JSON.parse(u);
          // Refresh user data from backend to get updated isVerified status
          if (parsed?.id) {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/profile/${parsed.username}`);
            if (res.ok) {
              const data = await res.json();
              if (data.success) {
                const freshUser = { ...parsed, ...data.data };
                localStorage.setItem('user', JSON.stringify(freshUser));
                setCurrentUser(freshUser);
                return;
              }
            }
          }
          setCurrentUser(parsed);
        } catch (e) {
          console.error("Error parsing user", e);
        }
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser?.id) fetchStories();
  }, [currentUser]);

  const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUploadingStory(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/social/stories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            mediaUrl: base64,
            caption: 'Nueva historia de Nexo'
          })
        });
        if (res.ok) {
          fetchStories();
          showToast('¡Historia compartida en la Dimensión Nexo!', 'success');
        }
      } catch (err) {
        showToast('Fallo en la conexión dimensional. Inténtalo de nuevo.', 'error');
      } finally {
        setIsUploadingStory(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const isOwnProfile = currentUser?.username?.toLowerCase() === profile.username?.toLowerCase();

  const handleProfilingComplete = () => {
    setShowProfiling(false);
    window.location.reload();
  };

  const handleEditSave = (updatedData: any) => {
    setProfile((prev: any) => ({ ...prev, ...updatedData }));
    if (updatedData.themeColor) {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...u, themeColor: updatedData.themeColor }));
    }
  };

  // Check if current user follows this profile
  useEffect(() => {
    if (currentUser?.id && profile?.id) {
      checkFollowingStatus();
      checkFriendshipStatus();
    }
  }, [currentUser, profile?.id]);

  const checkFriendshipStatus = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/friends/list/${currentUser?.id}`
      );
      const data = await res.json();
      if (data.success) {
        const isFriend = data.data.some((f: any) => f.id === profile.id);
        setFriendRequested(isFriend);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [friendRequested, setFriendRequested] = useState(false);

  const handleAddFriend = async () => {
    if (!currentUser?.id || !profile?.id) return;
    
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/friends/request`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, friendId: profile.id })
        }
      );
      const data = await res.json();
      if (data.success) {
        showToast('¡Solicitud de amistad enviada!', 'success');
        setFriendRequested(true);
      } else {
        showToast(data.message || 'Error al enviar solicitud', 'error');
      }
    } catch (err) {
      showToast('Error de conexión', 'error');
    }
  };

  const checkFollowingStatus = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/social/following/check?followerId=${currentUser.id}&followingId=${profile.id}`
      );
      const data = await res.json();
      if (data.success) {
        setIsFollowing(data.data.following);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle follow/unfollow
  const handleToggleFollow = async () => {
    if (!currentUser?.id || !profile?.id || followLoading) return;
    
    setFollowLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/social/follow`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            followerId: currentUser.id,
            followingId: profile.id
          })
        }
      );
      const data = await res.json();
      if (data.success) {
        setIsFollowing(data.data.followed);
        setProfile((prev: any) => ({
          ...prev,
          _count: {
            ...prev._count,
            followers: data.data.followed ? prev._count.followers + 1 : prev._count.followers - 1
          }
        }));
        showToast(data.data.followed ? '¡Ahora sigues a este usuario!' : 'Has dejado de seguir', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Error al seguir usuario', 'error');
    } finally {
      setFollowLoading(false);
    }
  };

  // Handle message button - create or get conversation
  const handleStartMessage = async () => {
    if (!currentUser?.id || !profile?.id) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/messaging/conversation`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            userA: currentUser.id,
            userB: profile.id
          })
        }
      );
      const data = await res.json();
      if (data.success) {
        setConversationId(data.data.id);
        setShowChatModal(true);
        fetchMessages(data.data.id);
      }
    } catch (err) {
      console.error(err);
      showToast('Error al iniciar conversación', 'error');
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/messaging/${convId}`
      );
      const data = await res.json();
      if (data.success) {
        setChatMessages(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send message via socket
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket || !currentUser?.id || !conversationId) return;

    setIsSending(true);
    const newMsg = {
      conversationId: conversationId,
      senderId: currentUser.id,
      content: chatInput
    };

    socket.emit('send_message', newMsg);
    setChatMessages(prev => [...prev, {
      ...newMsg,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      sender: { username: currentUser.username, avatarUrl: currentUser.avatarUrl }
    }]);
    setChatInput('');
    setTimeout(() => {
      const el = document.querySelector('.chat-messages');
      el?.scrollTo(0, el.scrollHeight);
    }, 100);
    setIsSending(false);
  };

  // Listen for messages
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleNewMessage = (msg: any) => {
      if (msg.conversationId === conversationId) {
        setChatMessages(prev => [...prev, msg]);
        setTimeout(() => {
          const el = document.querySelector('.chat-messages');
          el?.scrollTo(0, el.scrollHeight);
        }, 100);
      }
    };

    socket.on('new_message', handleNewMessage);
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, conversationId]);

  if (showProfiling) {
    return (
      <div className="profiling-overlay">
        <OnboardingWizard onComplete={handleProfilingComplete} initialData={profile} />
        <style jsx>{`
          .profiling-overlay { 
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px; 
            background: rgba(0, 0, 0, 0.8); 
            backdrop-filter: blur(15px);
            min-height: 100vh;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 9999;
            overflow-y: auto;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={styles.profileContainer}>
      {showEditModal && (
        <EditProfileModal 
          profile={profile} 
          onClose={() => setShowEditModal(false)} 
          onSave={handleEditSave}
        />
      )}
      
      {/* 1. Full-Width Banner & Header */}
      <div 
        className={styles.coverBanner} 
        data-tour="profile-header"
        style={{
          backgroundImage: profile.intelligence?.socialProfile?.favAnime?.bannerImage || profile.intelligence?.socialProfile?.favAnime?.coverImage
            ? `url(${profile.intelligence.socialProfile.favAnime.bannerImage || profile.intelligence.socialProfile.favAnime.coverImage})`
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className={styles.coverOverlay} style={{ background: profile.intelligence?.socialProfile?.favAnime ? 'linear-gradient(to top, rgba(3, 5, 8, 1) 0%, rgba(3, 5, 8, 0.7) 40%, rgba(3, 5, 8, 0.3) 100%)' : undefined }}></div>
        <div className={styles.headerContent}>
          <div 
            className={styles.avatarWrapper}
            style={{ borderColor: themeColor }}
            onClick={() => isOwnProfile && setShowProfiling(true)}
            title={isOwnProfile ? "Recalcular ADN de Anime" : ""}
          >
            <Image 
              src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.username}&background=random&color=fff`} 
              alt={profile.username}
              fill
              className={styles.avatarImage}
            />
            {profile.isPremium && <span className={styles.premiumLabel}>PREMIUM</span>}
          </div>

          <div className={styles.headerInfo}>
            <div>
              <div className={styles.mainInfo}>
                <h1>
                  {profile.username}
                  {profile.archetype && (
                    <span className={styles.archetypeBadge} style={{ color: themeColor, borderColor: themeColor }}>
                      ✨ {profile.archetype}
                    </span>
                  )}
                </h1>
              </div>
              <div className={styles.realName}>
                {profile.firstName} {profile.lastName} {profile.country && `• ${profile.country}`}
              </div>
              <div className={styles.statsRow}>
                <div className={styles.statItem} onClick={() => setShowFollowersModal(true)}>
                  <strong>{profile._count?.followers || 0}</strong> Seguidores
                </div>
                <div className={styles.statItem} onClick={() => setShowFollowingModal(true)}>
                  <strong>{profile._count?.following || 0}</strong> Siguiendo
                </div>
              </div>
            </div>

            <div className={styles.headerActions}>
              {isOwnProfile ? (
                <>
                  <button className={styles.btnSecondary} onClick={() => setShowProfiling(true)}>
                    ⚙️ Personalizar ADN
                  </button>
                  <button className={styles.btnPrimary} onClick={() => setShowEditModal(true)}>
                    ✏️ Editar Perfil
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className={styles.btnSecondary} 
                    onClick={handleAddFriend}
                    disabled={friendRequested || !currentUser?.isVerified}
                    title={!currentUser?.isVerified ? 'Verifica tu cuenta' : 'Agregar amigo'}
                  >
                    👤 {friendRequested ? 'Amigo/Agregado' : 'Agregar amigo'}
                  </button>
                  <button 
                    className={styles.btnSecondary} 
                    onClick={handleStartMessage}
                    disabled={!currentUser?.isVerified}
                  >
                    💬 Mensaje
                  </button>
                  <button 
                    className={styles.btnPrimary}
                    onClick={handleToggleFollow}
                    disabled={followLoading || !currentUser?.isVerified}
                  >
                    {isFollowing ? 'Siguiendo' : 'Seguir'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Three-Column Main Grid */}
      <div className={styles.mainGrid}>
        
        {/* Left Column: Info & DNA */}
        <div className={styles.leftColumn}>
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>🌍 Información</h2>
            {profile.bio && <p className={styles.bioText}>{profile.bio}</p>}
            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>👤</span>
                Miembro desde {new Date(profile.createdAt || Date.now()).getFullYear()}
              </div>
              {profile.country && (
                <div className={styles.infoItem}>
                  <span className={styles.infoIcon}>📍</span>
                  De {profile.country}
                </div>
              )}
            </div>
          </div>

          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>🧬 ADN de Anime</h2>
            <div className={styles.dnaTags}>
              {profile.affinities?.length > 0 ? (
                profile.affinities.filter((a: any) => a.category === 'GENRE').slice(0, 8).map((a: any) => (
                  <span key={a.name} className={styles.dnaTag} style={{ color: themeColor, borderColor: themeColor + '44' }}>
                    #{a.name}
                  </span>
                ))
              ) : (
                <p className="empty-info" style={{ color: '#888', fontStyle: 'italic' }}>Sin datos de afinidad.</p>
              )}
            </div>
          </div>

          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>🎭 Perfil Emocional</h2>
            <div className={styles.emotionPills}>
              {profile.intelligence?.emotionProfile ? (
                Object.keys(profile.intelligence.emotionProfile).map(key => (
                  <div key={key} className={styles.emotionPill}>
                    {key}
                  </div>
                ))
              ) : (
                <p style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem' }}>Aún no sincronizado.</p>
              )}
            </div>
          </div>
          
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>🏆 Logros</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,215,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,215,0,0.4)' }}>⭐</div>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(0,229,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,229,255,0.4)' }}>🔥</div>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,0,127,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,0,127,0.4)' }}>💎</div>
            </div>
          </div>
        </div>

        {/* Center Column: Posts Feed */}
        <div className={styles.centerColumn}>
          {isOwnProfile && (
            <div className={styles.createPostWrapper}>
              <CreatePost onPostCreated={fetchUserPosts} />
            </div>
          )}

          <div className={styles.feedContainer}>
            {loadingPosts ? (
              <div className="loader-mini" style={{ margin: '20px auto' }} />
            ) : posts.length === 0 ? (
              <div className={styles.emptyFeed}>
                <p>No hay publicaciones aún en este muro dimensional.</p>
              </div>
            ) : (
              posts.map(post => (
                <PostItem key={post.id} post={post} />
              ))
            )}
          </div>
        </div>

        {/* Right Column: Favorites & Activity (Mocked as requested) */}
        <div className={styles.rightColumn}>
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>⭐ Colección</h2>
            <div className={styles.favoritesGrid}>
              {/* Mocked grid items to simulate favorite animes */}
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className={styles.favoriteItem}>
                  <img src={`https://placehold.co/200x300/1a1a2e/8b5cf6?text=Anime+${i}`} alt={`Anime ${i}`} className={styles.favoriteImg} />
                </div>
              ))}
            </div>
            <button className={styles.viewAllBtn}>Ver colección completa</button>
          </div>

          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>⚡ Actividad Reciente</h2>
            <div className={styles.activityList}>
              <div className={styles.activityItem}>
                <div className={styles.activityIcon}>📺</div>
                <div className={styles.activityContent}>
                  <p>Añadió <strong>Jujutsu Kaisen</strong> a Viendo</p>
                  <span>Hace 2 horas</span>
                </div>
              </div>
              <div className={styles.activityItem}>
                <div className={styles.activityIcon} style={{ background: 'rgba(0, 229, 255, 0.1)', color: '#00E5FF', borderColor: 'rgba(0, 229, 255, 0.2)' }}>🏆</div>
                <div className={styles.activityContent}>
                  <p>Desbloqueó el logro <strong>Maratón Otaku</strong></p>
                  <span>Ayer a las 14:30</span>
                </div>
              </div>
              <div className={styles.activityItem}>
                <div className={styles.activityIcon} style={{ background: 'rgba(255, 215, 0, 0.1)', color: 'gold', borderColor: 'rgba(255, 215, 0, 0.2)' }}>💬</div>
                <div className={styles.activityContent}>
                  <p>Comentó en <strong>Frieren</strong></p>
                  <span>Hace 2 días</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MURO DE PUBLICACIONES (WALL) */}
      <div className="posts-section">
        <div className="section-header">
          <h2 style={{ color: themeColor }}>Muro de Nexo</h2>
        </div>

        {isOwnProfile && (
          <div style={{ marginBottom: '30px' }}>
            <CreatePost onPostCreated={fetchUserPosts} />
          </div>
        )}

        <div className="posts-feed">
          {loadingPosts ? (
            <div className="loader-mini" style={{ margin: '20px auto' }} />
          ) : posts.length === 0 ? (
            <div className="empty-content" style={{ textAlign: 'center', padding: '40px', color: '#b0b3b8' }}>
              <p>No hay publicaciones aún en este muro dimensional.</p>
            </div>
          ) : (
            posts.map(post => (
              <PostItem key={post.id} post={post} />
            ))
          )}
        </div>
      </div>

<div className="list-section">
         <h2>Colección de Anime</h2>
         {initialCollection && initialCollection.length > 0 ? (
           <div className="anime-grid">
             {initialCollection.map((entry: any) => (
               <div key={entry.animeId} className="anime-item-card">
                 <a href={`/dashboard/anime/${entry.animeId}`} style={{ textDecoration: 'none' }}>
                   <div className="poster-wrap">
                     <img src={entry.anime?.coverImage || '/default-anime.png'} alt={entry.anime?.title || 'Anime'} />
                   </div>
                   <div className="poster-info">
                     <p className="entry-status">{translateListStatus(entry.status)}</p>
                     <span className="entry-status" style={{ fontSize: '0.65rem', opacity: 0.6 }}>
                       {entry.anime?.titleRomaji || entry.anime?.titleEnglish || 'Título desconocido'}
                     </span>
                   </div>
                 </a>
               </div>
             ))}
           </div>
         ) : animeList && animeList.length > 0 ? (
           <div className="anime-grid">
             {animeList.map((entry: any) => (
               <div key={entry.id} className="anime-item-card">
                 <div className="poster-wrap">
                   <img src={entry.anime.coverImage} alt={entry.anime.title} />
                 </div>
                 <div className="poster-info">
                   <p className="entry-status">{translateListStatus(entry.status)}</p>
                   <div className="progress-bar"><div className="fill" style={{ width: '60%', backgroundColor: themeColor }}></div></div>
                 </div>
               </div>
             ))}
           </div>
         ) : (
           <p className="empty-list">Este usuario aún no ha añadido animes a su lista.</p>
         )}
       </div>

      {/* Story Viewer Modal */}
      {selectedStoryGroup && (
        <div className="story-viewer-overlay" onClick={() => setSelectedStoryGroup(null)}>
          <button className="btn-close-viewer">×</button>
          <div className="story-viewer-content" onClick={(e) => e.stopPropagation()}>
            <div className="story-viewer-header">
              <img src={selectedStoryGroup.user.avatarUrl || '/default-avatar.png'} alt="" />
              <div>
                <strong style={{ display: 'block' }}>{selectedStoryGroup.user.username}</strong>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{new Date(selectedStoryGroup.stories[0].createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
            <img src={selectedStoryGroup.stories[0].mediaUrl} className="story-viewer-media" alt="" />
            {selectedStoryGroup.stories[0].caption && (
              <div className="story-viewer-caption">{selectedStoryGroup.stories[0].caption}</div>
            )}
          </div>
        </div>
      )}

      {/* Modals from previous implementation */}
      {showFollowersModal && (
        <UserListModal type="followers" userId={profile.id} onClose={() => setShowFollowersModal(false)} />
      )}
      {showFollowingModal && (
        <UserListModal type="following" userId={profile.id} onClose={() => setShowFollowingModal(false)} />
      )}
      {showChatModal && (
        <ChatModal 
          profile={profile}
          currentUser={currentUser}
          conversationId={conversationId}
          chatMessages={chatMessages}
          chatInput={chatInput}
          isConnected={isConnected}
          isSending={isSending}
          setChatInput={setChatInput}
          onSendMessage={(content: string) => {
            if (!socket) return;
            setIsSending(true);
            const newMsg = {
              conversationId: conversationId,
              senderId: currentUser?.id,
              content
            };
            socket.emit('send_message', newMsg);
            setChatMessages(prev => [...prev, {
              ...newMsg,
              id: Date.now(),
              createdAt: new Date().toISOString(),
              sender: { username: currentUser?.username, avatarUrl: currentUser?.avatarUrl }
            }]);
            setChatInput('');
            setTimeout(() => {
              const el = document.querySelector('.chat-messages');
              el?.scrollTo(0, el.scrollHeight);
            }, 100);
            setIsSending(false);
          }}
          onClose={() => setShowChatModal(false)}
        />
      )}
      {toast && (
        <div className={`nexo-toast ${toast.type}`} style={{ 
          position: 'fixed', bottom: '30px', right: '30px', zIndex: 2000, 
          background: 'rgba(15, 15, 15, 0.8)', backdropFilter: 'blur(15px)', 
          border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '15px 25px'
        }}>
          <div className="toast-message">{toast.message}</div>
        </div>
      )}
    </div>
  );
};

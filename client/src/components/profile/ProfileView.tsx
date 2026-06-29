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


interface ProfileViewProps {
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
  const themeColor = profile.themeColor || '#00E5FF';

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
    <div className="profile-wrapper">
      {showEditModal && (
        <EditProfileModal 
          profile={profile} 
          onClose={() => setShowEditModal(false)} 
          onSave={handleEditSave}
        />
      )}
      
      <Card className="profile-header-card" style={{ borderColor: profile.isPremium ? 'gold' : themeColor }} data-tour="profile-header">
        <div className="avatar-section">
           <div 
            className="avatar-container cursor-pointer" 
            style={{ borderColor: themeColor }}
            onClick={() => isOwnProfile && setShowProfiling(true)}
            title={isOwnProfile ? "Recalcular ADN de Anime" : ""}
          >
              <Image 
                src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.username}&background=random&color=fff`} 
                alt={profile.username}
                fill
                style={{ objectFit: 'cover' }}
              />
           </div>
           {profile.isPremium && <span className="premium-label">PREMIUM</span>}
        </div>

        <div className="info-section">
          <div className="name-row">
            <h1 className="username" style={{ color: themeColor }}>{profile.username}</h1>
            {profile.archetype && (
              <div className="archetype-badge" style={{ backgroundColor: themeColor + '22', color: themeColor, borderColor: themeColor }}>
                ✨ {profile.archetype}
              </div>
            )}
            {isOwnProfile && (
              <button className="btn-activate-dna" onClick={() => setShowProfiling(true)} data-tour="profile-edit-btn">
                ⚙️ Personalizar Perfil
              </button>
            )}
          </div>
          
          <div className="real-name" style={{ color: '#aaa', fontSize: '1.2rem', marginBottom: '15px' }}>
            {profile.firstName} {profile.lastName} {profile.country && `• ${profile.country}`}
          </div>

          <p className="bio">{profile.bio || 'Este usuario prefiere mantener el misterio...'}</p>
          
          <div className="stats-row">
            <div className="stat clickable" onClick={() => setShowFollowersModal(true)}>
              <strong>{profile._count?.followers || 0}</strong> Seguidores
            </div>
            <div className="stat clickable" onClick={() => setShowFollowingModal(true)}>
              <strong>{profile._count?.following || 0}</strong> Siguiendo
            </div>
          </div>

{!isOwnProfile && (
             <div className="actions">
               <button 
                 className="btn-follow" 
                 style={{ 
                   backgroundColor: isFollowing ? '#444' : themeColor,
                   opacity: followLoading || !currentUser?.isVerified ? 0.5 : 1,
                   cursor: !currentUser?.isVerified ? 'not-allowed' : 'pointer'
                 }} 
                 onClick={handleToggleFollow}
                 disabled={followLoading || !currentUser?.isVerified}
                 title={!currentUser?.isVerified ? 'Verifica tu cuenta para seguir usuarios' : ''}
               >
                 {isFollowing ? 'Siguiendo' : 'Seguir'}
               </button>
               <button 
                 className="btn-msg" 
                 onClick={handleStartMessage}
                 disabled={!currentUser?.isVerified}
                 title={!currentUser?.isVerified ? 'Verifica tu cuenta para enviar mensajes' : ''}
                 style={{ opacity: !currentUser?.isVerified ? 0.5 : 1, cursor: !currentUser?.isVerified ? 'not-allowed' : 'pointer' }}
               >
                 Mensaje
               </button>
               <button 
                 className="btn-msg" 
                 onClick={handleAddFriend}
                 disabled={friendRequested || !currentUser?.isVerified}
                 style={{ 
                   opacity: friendRequested || !currentUser?.isVerified ? 0.5 : 1, 
                   cursor: friendRequested || !currentUser?.isVerified ? 'not-allowed' : 'pointer' 
                 }}
                 title={friendRequested ? 'Ya es amigo o solicitud enviada' : !currentUser?.isVerified ? 'Verifica tu cuenta para agregar amigos' : 'Agregar amigo'}
               >
                 {friendRequested ? 'Amigo/Agregado' : 'Agregar amigo'}
               </button>
             </div>
           )}

          {/* Followers Modal */}
          {showFollowersModal && (
            <UserListModal type="followers" userId={profile.id} onClose={() => setShowFollowersModal(false)} />
          )}

          {/* Following Modal */}
          {showFollowingModal && (
            <UserListModal type="following" userId={profile.id} onClose={() => setShowFollowingModal(false)} />
          )}

          {/* Chat Modal */}
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
        </div>
      </Card>

      <div className="stories-container">
        <div className="stories-scroll">
          {isOwnProfile && (
            <div className="story-item create">
              <label className="story-bubble create" style={{ borderColor: themeColor }}>
                <input type="file" accept="image/*" onChange={handleStoryUpload} hidden />
                {isUploadingStory ? (
                  <div className="loader-mini" />
                ) : (
                  <>
                    <img src={profile.avatarUrl || '/default-avatar.png'} alt="Tú" />
                    <div className="plus-icon" style={{ backgroundColor: themeColor }}>+</div>
                  </>
                )}
              </label>
              <span className="story-user">Añadir</span>
            </div>
          )}

          {stories.map((group) => (
            <div key={group.user.id} className="story-item" onClick={() => setSelectedStoryGroup(group)}>
              <div className="story-bubble" style={{ borderColor: themeColor }}>
                <img src={group.stories[0]?.mediaUrl || group.user.avatarUrl || '/default-avatar.png'} alt={group.user.username} />
              </div>
              <span className="story-user">{group.user.id === currentUser?.id ? 'Tu Historia' : group.user.username}</span>
            </div>
          ))}

        </div>
      </div>

      <div className="intelligence-grid" data-tour="profile-stats">
        <Card className="intel-card">
          <h3>ADN de Anime</h3>
          <div className="affinities-list">
            {profile.affinities?.length > 0 ? (
              profile.affinities.filter((a: any) => a.category === 'GENRE').slice(0, 8).map((a: any) => (
                <span key={a.name} className="affinity-tag" style={{ color: themeColor, borderColor: themeColor + '44' }}>
                  #{a.name}
                </span>
              ))
            ) : (
              <p className="empty-info">Sin datos de afinidad. Completa el cuestionario.</p>
            )}
          </div>
        </Card>

        <Card className="intel-card">
          <h3>Perfil Emocional</h3>
          <div className="emotions-badges">
            {profile.intelligence?.emotionProfile ? (
              Object.keys(profile.intelligence.emotionProfile).map(key => (
                <div key={key} className="emotion-pill">
                  <span className="emotion-name">{key}</span>
                </div>
              ))
            ) : (
              <p className="empty-info">Sincroniza tus emociones con Nexo IA.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="legends-section">
        <h2 style={{ color: themeColor }}>Leyendas Personales</h2>
        <div className="legends-grid">
          {profile.intelligence?.socialProfile?.favAnime && typeof profile.intelligence.socialProfile.favAnime === 'object' ? (
            <a href={`/dashboard/anime/${profile.intelligence.socialProfile.favAnime.id}`} className="legend-link">
              <Card className="legend-card visual" style={{ borderColor: themeColor + '44', background: 'rgba(15,15,15,0.6)' }}>
                <div className="legend-overlay">
                  <div className="legend-label">Anime de Culto</div>
                  <div className="legend-name">{profile.intelligence.socialProfile.favAnime.title}</div>
                </div>
              </Card>
            </a>
          ) : (
            <Card className="legend-card empty" style={{ borderColor: themeColor + '11' }}>
               <div className="empty-content">
                  <p className="empty-info">{profile.intelligence?.socialProfile?.favAnime || 'No has elegido tu anime leyenda.'}</p>
                  {isOwnProfile && <button onClick={() => setShowProfiling(true)} className="btn-update-mini">Actualizar Visual</button>}
               </div>
            </Card>
          )}

          {profile.intelligence?.socialProfile?.favCharacter && typeof profile.intelligence.socialProfile.favCharacter === 'object' ? (
            <Card className="legend-card visual" style={{ borderColor: themeColor + '44', background: 'rgba(15,15,15,0.6)' }}>
              <div className="legend-overlay">
                <div className="legend-label">Espíritu Afín</div>
                <div className="legend-name">{profile.intelligence.socialProfile.favCharacter.name}</div>
              </div>
            </Card>
          ) : (
            <Card className="legend-card empty" style={{ borderColor: themeColor + '11' }}>
               <div className="empty-content">
                  <p className="empty-info">{profile.intelligence?.socialProfile?.favCharacter || 'No has elegido tu personaje leyenda.'}</p>
                  {isOwnProfile && <button onClick={() => setShowProfiling(true)} className="btn-update-mini">Actualizar Visual</button>}
               </div>
            </Card>
          )}
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

      {/* Premium Toast Notification */}
      {toast && (
        <div className={`nexo-toast ${toast.type}`}>
          <div className="toast-icon">
            {toast.type === 'success' ? '✨' : toast.type === 'error' ? '⚠️' : 'ℹ️'}
          </div>
          <div className="toast-message">{toast.message}</div>
          <div className="toast-progress" style={{ backgroundColor: themeColor }}></div>
        </div>
      )}

      <style jsx>{`
        .profile-wrapper { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }
        .profile-header-card { display: flex; gap: 40px; padding: 40px; margin-bottom: 30px; background: rgba(10, 10, 10, 0.4); backdrop-filter: blur(20px); border-radius: 32px; border-width: 1px; }
        .avatar-container { width: 180px; height: 180px; border-radius: 50%; overflow: hidden; position: relative; border: 3px solid #333; box-shadow: 0 0 30px rgba(0,0,0,0.5); }
        .premium-label { display: block; text-align: center; background: linear-gradient(gold, #b38728); color: black; font-weight: 900; font-size: 0.7rem; padding: 4px 0; border-radius: 4px; margin-top: 10px; }
        .name-row { display: flex; align-items: center; gap: 20px; margin-bottom: 5px; }
        .username { font-size: 3rem; font-weight: 900; margin: 0; }
        .archetype-badge { padding: 6px 16px; border-radius: 30px; font-weight: 800; font-size: 0.85rem; border: 1px solid; letter-spacing: 0.5px; }
        .btn-activate-dna { background: rgba(0, 229, 255, 0.1); color: #00E5FF; border: 1px dashed #00E5FF; padding: 8px 20px; border-radius: 30px; font-weight: 800; cursor: pointer; transition: all 0.2s; }
        .btn-activate-dna:hover { background: #00E5FF; color: black; border-style: solid; }
        .bio { color: #888; font-size: 1.1rem; margin-bottom: 25px; line-height: 1.6; max-width: 500px; }
        .stats-row { display: flex; gap: 30px; margin-bottom: 30px; }
        .stat { color: #555; }
        .stat strong { color: white; margin-right: 5px; }
        .actions { display: flex; gap: 15px; }
        .btn-follow { border: none; padding: 12px 40px; border-radius: 12px; font-weight: 900; cursor: pointer; color: black; }
        .btn-msg { background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 12px 25px; border-radius: 12px; cursor: pointer; }
        .intelligence-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
        .intel-card { padding: 25px; background: rgba(15,15,15,0.3); border-radius: 24px; }
        .intel-card h3 { margin: 0 0 20px 0; font-size: 1rem; color: #555; text-transform: uppercase; letter-spacing: 1px; }
        .affinities-list { display: flex; flex-wrap: wrap; gap: 10px; }
        .affinity-tag { padding: 5px 15px; border-radius: 20px; border: 1px solid; font-size: 0.85rem; font-weight: 700; }
        .emotions-badges { display: flex; gap: 10px; flex-wrap: wrap; }
        .emotion-pill { background: rgba(255,255,255,0.05); padding: 8px 20px; border-radius: 12px; font-weight: 600; color: #eee; }
        .empty-info, .empty-list { color: #444; font-size: 0.9rem; font-style: italic; }
        .list-section h2 { font-size: 1.8rem; font-weight: 900; margin-bottom: 20px; }
        .anime-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; }
        .anime-item-card { background: #111; border-radius: 16px; overflow: hidden; border: 1px solid #222; }
        .poster-wrap { height: 250px; overflow: hidden; }
        .poster-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .poster-info { padding: 15px; }
        .entry-status { font-size: 0.75rem; font-weight: 800; color: #888; text-transform: uppercase; margin-bottom: 8px; }
        .progress-bar { height: 4px; background: #222; border-radius: 2px; overflow: hidden; }
        .progress-bar .fill { height: 100%; }

        .stories-container { margin-bottom: 30px; }
        .stories-scroll { display: flex; gap: 20px; overflow-x: auto; padding: 10px 5px; scrollbar-width: none; }
        .stories-scroll::-webkit-scrollbar { display: none; }
        .story-item { display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; min-width: 80px; }
        .story-bubble { 
          width: 75px; height: 75px; border-radius: 50%; padding: 3px; border: 3px solid; 
          transition: all 0.3s; position: relative; background: #111;
        }
        .story-bubble img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
        .story-item:hover .story-bubble { transform: scale(1.1) rotate(5deg); }
        .story-bubble.create { cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .plus-icon { 
          position: absolute; bottom: 0; right: 0; width: 22px; height: 22px; 
          border-radius: 50%; color: black; display: flex; align-items: center; 
          justify-content: center; font-size: 16px; font-weight: 900; border: 2px solid #000;
        }
        .story-user { font-size: 0.8rem; font-weight: 600; color: #aaa; text-align: center; max-width: 80px; overflow: hidden; text-overflow: ellipsis; }

        .story-viewer-overlay { 
          position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 1000; 
          display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);
        }
        .story-viewer-content { width: 100%; max-width: 450px; height: 85vh; position: relative; border-radius: 20px; overflow: hidden; }
        .story-viewer-media { width: 100%; height: 100%; object-fit: cover; }
        .story-viewer-header { 
          position: absolute; top: 0; left: 0; right: 0; padding: 20px; 
          background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
          display: flex; align-items: center; gap: 15px;
        }
        .story-viewer-header img { width: 40px; height: 40px; border-radius: 50%; }
        .story-viewer-caption { 
          position: absolute; bottom: 0; left: 0; right: 0; padding: 30px; 
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
          color: white; font-size: 1.1rem; text-align: center;
        }
        .btn-close-viewer { position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); border: none; color: white; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 20px; z-index: 10; }
        
        .loader-mini { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.1); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Premium Toast CSS */
        .nexo-toast {
          position: fixed; bottom: 30px; right: 30px; z-index: 2000;
          background: rgba(15, 15, 15, 0.8); backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px;
          padding: 16px 24px; display: flex; align-items: center; gap: 15px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          animation: toast-slide-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          max-width: 350px; overflow: hidden;
        }
        .nexo-toast.success { border-left: 4px solid ${themeColor}; }
        .nexo-toast.error { border-left: 4px solid #ff4b2b; }
        .toast-icon { font-size: 1.2rem; }
        .toast-message { color: white; font-size: 0.95rem; font-weight: 600; }
        .toast-progress {
          position: absolute; bottom: 0; left: 0; height: 3px;
          animation: toast-progress 4s linear forwards;
        }

        @keyframes toast-slide-in {
          from { transform: translateX(120%) scale(0.8); opacity: 0; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }

        .legends-section, .posts-section { margin-bottom: 50px; }
        .legends-section h2, .posts-section h2 { font-size: 1.8rem; font-weight: 900; margin-bottom: 25px; }
        .legends-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 30px; margin-bottom: 40px; }
        .legend-link { text-decoration: none; display: block; transition: transform 0.3s; }
        .legend-link:hover { transform: translateY(-5px); }
        .legend-card { 
          position: relative; height: 140px; border-radius: 24px; overflow: hidden; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer;
          background: rgba(15, 15, 15, 0.4); border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: flex; align-items: center;
        }
        .legend-card:hover { transform: translateY(-8px) scale(1.02); border-color: ${themeColor}; box-shadow: 0 15px 35px rgba(0,0,0,0.4); }
        .legend-overlay { position: relative; z-index: 1; padding: 25px 35px; width: 100%; display: flex; flex-direction: column; justify-content: center; }
        .legend-label { font-size: 0.75rem; font-weight: 900; color: ${themeColor}; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 2px; opacity: 0.8; }
        .legend-name { font-size: 1.8rem; font-weight: 900; color: white; line-height: 1.1; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .btn-new-post { border: none; padding: 10px 20px; border-radius: 12px; font-weight: 900; color: black; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: transform 0.2s; }
        .btn-new-post:hover { transform: scale(1.05); }
        .btn-update-mini { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #888; padding: 5px 12px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; cursor: pointer; margin-top: 10px; }
        .empty-content { display: flex; flex-direction: column; align-items: center; }
        .posts-feed { display: flex; flex-direction: column; gap: 15px; }
        .post-item-card { padding: 25px; background: rgba(15,15,15,0.4); border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); }
        .post-date { font-size: 0.8rem; color: #444; font-weight: 700; }
        .post-body { margin: 15px 0; color: #ddd; font-size: 1.1rem; line-height: 1.5; }
        .post-footer { display: flex; gap: 20px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px; }
        .post-stat { font-size: 0.9rem; font-weight: 800; color: #666; }
        .stat.clickable { cursor: pointer; }
        .stat.clickable:hover strong { text-decoration: underline; }
        .modal-overlay { 
          position: fixed; 
          inset: 0; 
          background: rgba(0,0,0,0.85); 
          backdrop-filter: blur(10px); 
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cursor-pointer { cursor: pointer; }
        
        @media (max-width: 768px) {
          .profile-header-card { flex-direction: column; align-items: center; text-align: center; }
          .username { font-size: 2.2rem; }
          .name-row { flex-direction: column; }
          .intelligence-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

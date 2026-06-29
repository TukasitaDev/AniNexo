'use client';

import { useState, useRef, useEffect } from 'react';
import { ThumbsUp, MessageSquare, Share2, MoreHorizontal, X, Send, Bookmark } from 'lucide-react';
import { Card } from '../ui/Card/Card';

interface CommentData {
  id: string;
  content: string;
  createdAt: string;
  user: {
    username: string;
    avatarUrl: string;
  };
}

interface LikeData {
  id: string;
  userId: string;
  reaction: string;
}

interface PostData {
  id: string;
  content: string;
  mediaUrl?: string;
  animeId?: number;
  anime?: {
    id: number;
    titleRomaji?: string;
    titleEnglish?: string;
    coverImage?: string;
  };
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string;
    isPremium: boolean;
  };
  _count: {
    comments: number;
    likes: number;
  };
  likes?: LikeData[];
  comments?: CommentData[];
  isPrivate?: boolean;
}

const reactionIcons: Record<string, { emoji: string; label: string; color: string }> = {
  LIKE: { emoji: '👍', label: 'Me gusta', color: '#00E5FF' },
  LOVE: { emoji: '❤️', label: 'Me encanta', color: '#ff4759' },
  WOW: { emoji: '😲', label: 'Wow', color: '#ffa502' },
  SAD: { emoji: '😢', label: 'Triste', color: '#5f67b7' },
  ANGRY: { emoji: '😠', label: 'Enojado', color: '#ff4759' }
};

export function PostItem({ post }: { post: PostData }) {
  const [likesCount, setLikesCount] = useState(post._count?.likes || 0);
  const [userReaction, setUserReaction] = useState<string | null>(() => {
    try {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (userStr && post.likes) {
        const user = JSON.parse(userStr);
        const like = post.likes.find((l: any) => l.userId === user.id);
        return like?.reaction || null;
      }
    } catch (e) {}
    return null;
  });
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState<CommentData[]>(post.comments || []);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showPost, setShowPost] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editIsPrivate, setEditIsPrivate] = useState(post.isPrivate || false);
  const [showBurst, setShowBurst] = useState(false);
  const [burstReaction, setBurstReaction] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareContent, setShareContent] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const reactionsRef = useRef<HTMLDivElement>(null);

  const handleReaction = async (reaction: string) => {
    setBurstReaction(reaction);
    setShowBurst(true);
    setTimeout(() => setShowBurst(false), 1000);
    
    try {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (!userStr || !token) return;

      const user = JSON.parse(userStr);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/social/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: user.id, postId: post.id, reaction })
      });

      const data = await res.json();
      if (data.success) {
        if (data.data.liked) {
          setUserReaction(reaction);
          setLikesCount(prev => prev + 1);
          await addMemory(user.id, post.id);
        } else {
          setUserReaction(null);
          setLikesCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (!userStr || !token) return;

      const user = JSON.parse(userStr);
      setIsSubmittingComment(true);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/feed/post/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          userId: user.id, 
          content: editContent,
          isPrivate: editIsPrivate
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        post.content = data.data.content;
        post.isPrivate = data.data.isPrivate;
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (!userStr || !token) return;

      const user = JSON.parse(userStr);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/feed/post/${post.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: user.id })
      });

      const data = await res.json();
      if (data.success) {
        setShowPost(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (reactionsRef.current && !reactionsRef.current.contains(e.target as Node)) {
        setShowReactions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLike = async () => {
    if (userReaction) {
      await handleReaction(''); // Will remove the like
    } else {
      await handleReaction('LIKE');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (!userStr || !token) return;

      const user = JSON.parse(userStr);
      setIsSubmittingComment(true);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/feed/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id,
          postId: post.id,
          content: newComment.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        setCommentsList(prev => [...prev, data.data]);
        setNewComment('');
        await addMemory(user.id, post.id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleSavePost = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (!userStr || !token) return;

      const user = JSON.parse(userStr);

      if (isSaved) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/feed/post/${post.id}/save`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ userId: user.id })
        });
        setIsSaved(false);
      } else {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/feed/post/${post.id}/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ userId: user.id })
        });
        setIsSaved(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareContent.trim()) return;

    try {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (!userStr || !token) return;

      const user = JSON.parse(userStr);
      setIsSharing(true);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/feed/post/${post.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id,
          content: shareContent.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowShareModal(false);
        setShareContent('');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSharing(false);
    }
  };

  const addMemory = async (userId: string, postId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/feed/memory/interaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, postId })
      });
    } catch (error) {
      console.error('Error adding memory:', error);
    }
  };

  if (!showPost) return null;

  // Get current user ID for ownership check
  let currentUserId: string | null = null;
  try {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (userStr) {
      currentUserId = JSON.parse(userStr).id;
    }
  } catch (e) {}
  const isOwner = currentUserId === post.user.id;

return (
    <Card className="fb-post-card glass-panel hover-lift hover-glow-magenta">
      {/* Header */}
      <div className="post-header">
        <img 
          src={post.user.avatarUrl || 'https://ui-avatars.com/api/?name=User'} 
          className="post-avatar" 
          alt="" 
        />
        <div className="post-meta">
          <div className="user-name">
            <span className="profile-link">{post.user.username}</span>
            {post.user.isPremium && <span className="premium-star">★ Premium</span>}
            {post.anime && (
              <a href={`/dashboard/anime/${post.anime.id}`} className="anime-mention-badge">
                🏷️ {post.anime.titleRomaji || post.anime.titleEnglish}
              </a>
            )}
            {post.isPrivate && <span className="private-badge">🔒 Privado</span>}
          </div>
          <div className="post-time">
            {new Date(post.createdAt).toLocaleDateString()} • 🌎
          </div>
        </div>
        <div className="header-actions" ref={menuRef}>
          <div className="menu-container">
            <button className="icon-btn-header save-btn" onClick={handleSavePost} title={isSaved ? 'Quitar de guardado' : 'Guardar publicación'}>
              <Bookmark size={18} fill={isSaved ? 'var(--color-primary)' : 'none'} />
            </button>
          </div>
          <div className="menu-container">
            {isOwner && (
              <button className="icon-btn-header" onClick={() => setShowMenu(!showMenu)}>
                <MoreHorizontal size={18} />
              </button>
            )}
            {showMenu && (
              <div className="post-menu">
                <button onClick={() => { setIsEditing(true); setShowMenu(false); }}>
                  Editar publicación
                </button>
                <button onClick={() => { setEditIsPrivate(!editIsPrivate); handleEdit(); }}>
                  {post.isPrivate ? 'Hacer pública' : 'Hacer privada'}
                </button>
                <button onClick={handleDelete} className="delete-btn">
                  Eliminar publicación
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="post-content">
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleEdit}
            className="edit-content-input"
            autoFocus
          />
        ) : (
          <p>{post.content}</p>
        )}
      </div>

      {/* Media */}
      {post.mediaUrl && (
        <div className="post-media">
          <img src={post.mediaUrl} alt="" loading="lazy" />
        </div>
      )}

      {/* Stats Bar */}
      <div className="post-stats">
        <div className="reactions-count">
          <div className="react-icons-bubbles">
            {post.likes && Object.entries(
              post.likes.reduce((acc: Record<string, number>, like: LikeData) => {
                if (!acc[like.reaction]) acc[like.reaction] = 0;
                acc[like.reaction]++;
                return acc;
              }, {} as Record<string, number>)
            ).map(([reaction, count]) => (
              reactionIcons[reaction] ? (
                <span 
                  key={reaction} 
                  className="react-bubble-preview" 
                  title={`${count} ${reactionIcons[reaction].label}`}
                >
                  {reactionIcons[reaction].emoji}
                </span>
              ) : null
            ))}
          </div>
          <span className="stats-number">{likesCount}</span>
        </div>
        <div className="comments-count" onClick={() => setShowComments(!showComments)}>
          {commentsList.length} {commentsList.length === 1 ? 'comentario' : 'comentarios'}
        </div>
      </div>

      <div className="post-divider" />

      {/* Action Buttons */}
      <div className="post-actions">
        <div className="like-wrapper" ref={reactionsRef}>
          <button 
            className={`action-btn ${userReaction ? 'active' : ''}`} 
            onClick={() => handleLike()}
            onMouseEnter={() => setShowReactions(true)}
          >
            {userReaction && reactionIcons[userReaction] ? (
              <span className="reaction-emoji">{reactionIcons[userReaction].emoji}</span>
            ) : (
              <ThumbsUp size={18} />
            )}
            <span>{userReaction && reactionIcons[userReaction] ? reactionIcons[userReaction].label : 'Me gusta'}</span>
          </button>
          {showReactions && (
            <div className="reactions-popup" onMouseLeave={() => setShowReactions(false)}>
              {Object.entries(reactionIcons).map(([type, { emoji, label }]) => (
                <button
                  key={type}
                  className="reaction-option"
                  onClick={() => { handleReaction(type); setShowReactions(false); }}
                  title={label}
                >
                  <span className="reaction-popup-emoji">{emoji}</span>
                  <span className="reaction-popup-label">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
<button className={`action-btn ${showComments ? 'active-comments' : ''}`} onClick={() => setShowComments(!showComments)}>
           <MessageSquare size={18} />
           <span>Comentar</span>
         </button>
         <button className="action-btn" onClick={() => setShowShareModal(true)}>
           <Share2 size={18} />
           <span>Compartir</span>
         </button>
       </div>

       {/* Share Modal */}
       {showShareModal && (
         <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
           <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
             <h3>Compartir publicación</h3>
             <p className="original-author">De: @{post.user.username}</p>
             <textarea
               placeholder="¿Qué quieres decir? (opcional)"
               value={shareContent}
               onChange={(e) => setShareContent(e.target.value)}
               className="share-textarea"
             />
             <div className="share-actions">
               <button onClick={() => setShowShareModal(false)} className="btn-cancel">Cancelar</button>
               <button onClick={handleShareSubmit} disabled={isSharing} className="btn-share">
                 {isSharing ? 'Compartiendo...' : 'Compartir'}
               </button>
             </div>
           </div>
         </div>
       )}

{/* Burst Animation */}
      {showBurst && burstReaction && (
        <div className="reaction-burst">
          <span className="burst-emoji">
            {reactionIcons[burstReaction]?.emoji || '👍'}
          </span>
        </div>
      )}

      {/* Comments Drawer */}
      {showComments && (
        <div className="comments-section animate-fade-in">
          <div className="post-divider" style={{ margin: '0 0 12px 0' }} />
          
          <div className="comments-list">
            {commentsList.map(comment => (
              <div key={comment.id} className="comment-item">
                <img 
                  src={comment.user.avatarUrl || 'https://ui-avatars.com/api/?name=User'} 
                  alt="" 
                  className="comment-avatar" 
                />
                <div className="comment-content-bubble">
                  <div className="comment-user-header">
                    <span className="comment-username">{comment.user.username}</span>
                  </div>
                  <p className="comment-text">{comment.content}</p>
                  <span className="comment-time">{new Date(comment.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {commentsList.length === 0 && (
              <p className="no-comments-yet">Aún no hay comentarios. ¡Inicia la conversación!</p>
            )}
          </div>

          {/* Comment input form */}
          <form className="comment-form" onSubmit={handleCommentSubmit}>
            <img 
              src={typeof window !== 'undefined' && localStorage.getItem('user') 
                ? JSON.parse(localStorage.getItem('user')!).avatarUrl || 'https://ui-avatars.com/api/?name=Me'
                : 'https://ui-avatars.com/api/?name=User'
              } 
              alt="Me" 
              className="my-comment-avatar" 
            />
            <div className="comment-input-wrapper">
              <input 
                type="text" 
                placeholder="Escribe un comentario..." 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={isSubmittingComment}
              />
              <button type="submit" className="btn-send-comment" disabled={isSubmittingComment || !newComment.trim()}>
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      )}

      <style jsx>{`
        .fb-post-card { 
          padding: 0 !important; 
          background: rgba(15, 15, 15, 0.75) !important; 
          backdrop-filter: blur(25px); 
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          margin-bottom: 20px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
          transition: border-color 0.3s;
        }

        .fb-post-card:hover {
          border-color: rgba(0, 229, 255, 0.2);
        }

        .post-header { 
          display: flex; 
          align-items: center; 
          padding: 14px 16px; 
          gap: 12px; 
        }

        .post-avatar { 
          width: 40px; 
          height: 40px; 
          border-radius: 50%; 
          object-fit: cover; 
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .post-meta { 
          flex: 1; 
        }

        .user-name { 
          font-weight: 700; 
          color: white; 
          display: flex; 
          align-items: center; 
          flex-wrap: wrap; 
          gap: 8px; 
          font-size: 0.95rem; 
        }

        .profile-link {
          cursor: pointer;
        }

        .profile-link:hover {
          text-decoration: underline;
        }

        .premium-star { 
          background: linear-gradient(90deg, #00E5FF, #af50ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-size: 0.75rem; 
          font-weight: 900;
          letter-spacing: 0.5px;
          border: 1px solid rgba(0, 229, 255, 0.2);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .post-time { 
          font-size: 0.8rem; 
          color: #888; 
          margin-top: 2px;
        }

        .header-actions {
          display: flex;
          gap: 6px;
        }

        .icon-btn-header {
          background: transparent;
          border: none;
          color: #888;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s, color 0.2s;
        }

        .icon-btn-header:hover {
          background-color: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .anime-mention-badge { 
          background: rgba(0, 229, 255, 0.08); 
          color: #00E5FF; 
          padding: 1px 8px; 
          border-radius: 4px; 
          font-size: 0.75rem; 
          text-decoration: none; 
          border: 1px solid rgba(0, 229, 255, 0.15); 
          transition: all 0.2s;
        }

        .anime-mention-badge:hover { 
          background: rgba(0, 229, 255, 0.15); 
          transform: translateY(-1px); 
        }

        .post-content { 
          padding: 4px 16px 14px 16px; 
          color: #e4e6eb; 
          line-height: 1.5; 
          font-size: 0.95rem; 
        }
        
        .post-media { 
          width: 100%; 
          background: #000; 
          display: flex; 
          justify-content: center; 
          border-top: 1px solid rgba(255,255,255,0.03);
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }

        .post-media img { 
          max-width: 100%; 
          max-height: 550px; 
          object-fit: contain; 
        }

        .post-stats { 
          display: flex; 
          justify-content: space-between; 
          padding: 10px 16px; 
          color: #b0b3b8; 
          font-size: 0.85rem; 
        }

        .reactions-count {
          display: flex;
          align-items: center;
          gap: 6px;
        }

.react-icons-bubbles {
           display: flex;
           align-items: center;
         }

         .react-bubble-preview {
           font-size: 18px;
           margin-right: -4px;
         }

        .stats-number {
          margin-left: 6px;
          font-weight: 500;
        }

        .comments-count {
          cursor: pointer;
        }

        .comments-count:hover {
          text-decoration: underline;
        }
        
        .post-divider { 
          height: 1px; 
          background: rgba(255, 255, 255, 0.08); 
          margin: 0 16px; 
        }
        
        .post-actions { 
          display: flex; 
          padding: 4px 8px; 
        }

        .action-btn { 
          flex: 1; 
          background: transparent; 
          border: none; 
          color: #b0b3b8; 
          padding: 8px; 
          border-radius: 8px; 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 8px;
          font-weight: 600; 
          font-size: 0.85rem; 
          transition: background-color 0.2s, color 0.2s;
        }

        .action-btn:hover { 
          background-color: rgba(255, 255, 255, 0.05); 
          color: white;
        }

        .action-btn.active { 
          color: #00E5FF; 
          text-shadow: 0 0 10px rgba(0, 229, 255, 0.2);
        }

        .action-btn.active-comments {
          color: #af50ff;
        }

        /* Comments drawer */
        .comments-section {
          padding: 12px 16px 16px 16px;
          background: rgba(0, 0, 0, 0.2);
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 14px;
          max-height: 250px;
          overflow-y: auto;
          scrollbar-width: none;
        }

        .comments-list::-webkit-scrollbar {
          display: none;
        }

        .comment-item {
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }

        .comment-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-top: 2px;
        }

        .comment-content-bubble {
          flex: 1;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 8px 12px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
        }

        .comment-username {
          font-size: 0.8rem;
          font-weight: 700;
          color: #e4e6eb;
        }

        .comment-text {
          font-size: 0.85rem;
          color: #b0b3b8;
          margin-top: 3px;
          line-height: 1.4;
        }

        .comment-time {
          font-size: 0.7rem;
          color: #555;
          align-self: flex-start;
          margin-top: 4px;
        }

        .no-comments-yet {
          text-align: center;
          font-size: 0.8rem;
          color: #6b6b6b;
          padding: 8px;
        }

.like-wrapper {
           position: relative;
         }

.reactions-popup {
           position: absolute;
           bottom: 100%;
           left: 0;
           background: rgba(30, 30, 30, 0.95);
           backdrop-filter: blur(10px);
           border: 1px solid rgba(255, 255, 255, 0.1);
           border-radius: 24px;
           padding: 8px 12px;
           display: flex;
           gap: 8px;
           margin-bottom: 8px;
           box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
           z-index: 10;
         }

         .reaction-option {
           background: transparent;
           border: none;
           cursor: pointer;
           padding: 4px;
           border-radius: 50%;
           display: flex;
           flex-direction: column;
           align-items: center;
           justify-content: center;
           transition: transform 0.2s;
           width: 40px;
         }

         .reaction-option:hover {
           transform: scale(1.2);
         }

         .reaction-popup-emoji {
           font-size: 24px;
         }

         .reaction-emoji {
           font-size: 18px;
         }

         .burst-emoji {
           font-size: 60px;
           animation: burstAnim 1s ease-out forwards;
         }

         .reaction-burst {
           position: fixed;
           top: 0;
           left: 0;
           width: 100vw;
           height: 100vh;
           pointer-events: none;
           z-index: 1000;
           display: flex;
           align-items: center;
           justify-content: center;
         }

         /* Post Menu */
         .menu-container {
           position: relative;
         }

         .post-menu {
           position: absolute;
           top: 100%;
           right: 0;
           background: rgba(30, 30, 30, 0.95);
           backdrop-filter: blur(10px);
           border: 1px solid rgba(255, 255, 255, 0.1);
           border-radius: 8px;
           padding: 8px 0;
           margin-top: 8px;
           min-width: 180px;
           box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
           z-index: 10;
         }

         .post-menu button {
           width: 100%;
           background: transparent;
           border: none;
           color: #e4e6eb;
           padding: 10px 16px;
           text-align: left;
           cursor: pointer;
           font-size: 0.85rem;
           transition: background-color 0.2s;
         }

         .post-menu button:hover {
           background: rgba(255, 255, 255, 0.08);
         }

         .post-menu .delete-btn {
           color: #ff4759;
         }

         .post-menu .delete-btn:hover {
           background: rgba(255, 71, 89, 0.15);
         }

         /* Edit Content */
         .edit-content-input {
           width: 100%;
           background: rgba(255, 255, 255, 0.05);
           border: 1px solid rgba(255, 255, 255, 0.1);
           border-radius: 8px;
           padding: 12px;
           color: white;
           font-size: 0.95rem;
           resize: vertical;
           min-height: 80px;
         }

         .edit-content-input:focus {
           outline: none;
           border-color: #00E5FF;
         }

         /* Private Badge */
         .private-badge {
           background: rgba(255, 71, 89, 0.15);
           color: #ff6b6b;
           padding: 1px 6px;
           border-radius: 4px;
           font-size: 0.7rem;
           font-weight: 600;
         }

         /* Comment form */
        .comment-form {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-top: 10px;
        }

        .my-comment-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }

        .comment-input-wrapper {
          flex: 1;
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 4px 8px 4px 14px;
          align-items: center;
          transition: border-color 0.3s;
        }

        .comment-input-wrapper:focus-within {
          border-color: #00E5FF;
        }

        .comment-input-wrapper input {
          flex: 1;
          border: none;
          background: transparent;
          color: white;
          outline: none;
          font-size: 0.85rem;
          padding: 6px 0;
        }

        .btn-send-comment {
          background: transparent;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .comment-input-wrapper input:focus + .btn-send-comment,
        .btn-send-comment:hover {
          color: #00E5FF;
        }

        .btn-send-comment:disabled {
          color: #333 !important;
          cursor: not-allowed;
        }

        .animate-fade-in {
          animation: fadeIn 0.25s ease-out;
        }

@keyframes fadeIn {
           from { opacity: 0; transform: translateY(-5px); }
           to { opacity: 1; transform: translateY(0); }
         }

@keyframes burstAnim {
            0% { transform: scale(0) rotate(0deg); opacity: 0; }
            20% { transform: scale(1.2) rotate(10deg); opacity: 1; }
            100% { transform: scale(2) rotate(-10deg) translateY(-50px); opacity: 0; }
          }

          /* Share Modal */
          .share-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(5px);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .share-modal-content {
            background: #1a1a1a;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 24px;
            min-width: 360px;
            max-width: 90%;
          }

          .share-modal-content h3 {
            margin: 0 0 10px 0;
            color: var(--color-primary);
            font-weight: 900;
          }

          .original-author {
            color: #888;
            font-size: 0.85rem;
            margin-bottom: 12px;
          }

          .share-textarea {
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 12px;
            color: white;
            font-size: 0.9rem;
            min-height: 80px;
            resize: vertical;
            outline: none;
            margin-bottom: 16px;
          }

          .share-textarea:focus {
            border-color: var(--color-primary);
          }

          .share-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
          }

          .btn-cancel, .btn-share {
            padding: 10px 20px;
            border-radius: 8px;
            border: none;
            font-weight: 800;
            cursor: pointer;
          }

          .btn-cancel {
            background: transparent;
            color: #888;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          .btn-share {
            background: var(--color-primary);
            color: black;
          }

          .btn-share:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          /* Save Button */
          .save-btn {
            color: var(--color-primary);
          }

          .save-btn:hover {
            background-color: rgba(0, 229, 255, 0.1);
          }
        `}</style>
      </Card>
    );
  }

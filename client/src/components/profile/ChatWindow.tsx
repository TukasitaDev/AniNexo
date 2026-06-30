'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

/* ─── Sticker set (anime-themed emojis) ─────────────────────────────────── */
const STICKERS = [
  '😊','😂','🥺','😍','😭','🤩','😤','😱','🙈','💀',
  '🔥','❤️','💙','⭐','🌸','🎌','🗡️','⚡','🌊','🎭',
  '🍜','🍣','🌺','🦊','🐉','⛩️','🎋','🌙','✨','💫',
  '🎆','🎑','👒','🎎','🏮','🪄','🐾','🌀','💎','🎯',
];

/* ─── Giphy public demo key (replace with your own in production) ─────────── */
const GIPHY_KEY = 'dc6zaTOxFJmzC';

interface Msg {
  id: string | number;
  content: string;
  senderId?: string;
  sender?: { username: string; avatarUrl?: string };
  createdAt?: string;
  type?: 'text' | 'image' | 'audio' | 'sticker' | 'gif';
  seen?: boolean;
  audioUrl?: string;
  imageUrl?: string;
}

interface ChatWindowProps {
  profile: any;
  currentUser: any;
  conversationId: string | null;
  chatMessages: Msg[];
  chatInput: string;
  isConnected: boolean;
  isSending: boolean;
  setChatInput: (v: string) => void;
  onSendMessage: (content: string, type?: string) => void;
  onClose: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  profile, currentUser, conversationId, chatMessages,
  chatInput, isConnected, isSending,
  setChatInput, onSendMessage, onClose,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLInputElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);

  const [minimized,   setMinimized]   = useState(false);
  const [panel,       setPanel]       = useState<'none'|'stickers'|'gif'>('none');
  const [gifQuery,    setGifQuery]    = useState('anime');
  const [gifs,        setGifs]        = useState<any[]>([]);
  const [gifLoading,  setGifLoading]  = useState(false);
  const [recording,   setRecording]   = useState(false);
  const [audioSec,    setAudioSec]    = useState(0);
  const [imagePreview, setImagePreview] = useState<string|null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const audioTimerRef    = useRef<ReturnType<typeof setInterval>|null>(null);

  /* scroll to bottom */
  useEffect(() => {
    if (!minimized) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, minimized]);

  /* focus input on open */
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 120); }, []);

  /* ─── GIF search ────────────────────────────────────────────────────────── */
  const searchGifs = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setGifLoading(true);
    try {
      const res  = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=18&rating=g`);
      const data = await res.json();
      setGifs(data.data || []);
    } catch { setGifs([]); }
    finally  { setGifLoading(false); }
  }, []);

  useEffect(() => {
    if (panel === 'gif') searchGifs(gifQuery);
  }, [panel, gifQuery, searchGifs]);

  /* ─── Send helpers ─────────────────────────────────────────────────────── */
  const sendText = () => {
    if (chatInput.trim() && !isSending) {
      onSendMessage(chatInput.trim(), 'text');
    }
  };

  const sendSticker = (s: string) => {
    onSendMessage(s, 'sticker');
    setPanel('none');
  };

  const sendGif = (gifUrl: string) => {
    onSendMessage(`[GIF]${gifUrl}`, 'gif');
    setPanel('none');
  };

  const sendLike = () => onSendMessage('👍', 'sticker');

  /* ─── Image ────────────────────────────────────────────────────────────── */
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setImagePreview(b64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const confirmSendImage = () => {
    if (!imagePreview) return;
    onSendMessage(`[IMAGE]${imagePreview}`, 'image');
    setImagePreview(null);
  };

  /* ─── Audio recording ───────────────────────────────────────────────────── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = e => audioChunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          onSendMessage(`[AUDIO]${reader.result as string}`, 'audio');
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setAudioSec(0);
      audioTimerRef.current = setInterval(() => setAudioSec(s => s + 1), 1000);
    } catch {
      alert('No se pudo acceder al micrófono.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    clearInterval(audioTimerRef.current!);
    setRecording(false);
    setAudioSec(0);
  };

  /* ─── Helpers ────────────────────────────────────────────────────────────── */
  const formatTime = (s?: string) => {
    if (!s) return '';
    try { return new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  const fmtSec = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const isMe = (msg: Msg) =>
    msg.senderId === currentUser?.id ||
    msg.sender?.username === currentUser?.username;

  const profileAvatar = profile?.avatarUrl
    || `https://ui-avatars.com/api/?name=${profile?.username}&background=0866ff&color=fff`;

  const myAvatar = currentUser?.avatarUrl
    || `https://ui-avatars.com/api/?name=${currentUser?.username}&background=7c3aed&color=fff`;

  /* ─── Render message content ─────────────────────────────────────────────── */
  const renderContent = (msg: Msg) => {
    const c = msg.content;
    if (c.startsWith('[IMAGE]')) {
      return (
        <img
          src={c.slice(7)}
          alt="imagen"
          className="cw-bubble-img"
          onClick={() => window.open(c.slice(7), '_blank')}
        />
      );
    }
    if (c.startsWith('[GIF]')) {
      return (
        <img
          src={c.slice(5)}
          alt="gif"
          className="cw-bubble-img"
        />
      );
    }
    if (c.startsWith('[AUDIO]')) {
      return (
        <audio controls src={c.slice(7)} className="cw-bubble-audio" />
      );
    }
    if (msg.type === 'sticker') {
      return <span className="cw-sticker">{c}</span>;
    }
    return <span>{c}</span>;
  };

  /* ─── Group messages by date ─────────────────────────────────────────────── */
  const groupedMessages = () => {
    const groups: { dateLabel: string; messages: Msg[] }[] = [];
    chatMessages.forEach(msg => {
      const label = msg.createdAt
        ? new Date(msg.createdAt).toLocaleDateString('es', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
        : '';
      const last = groups[groups.length - 1];
      if (!last || last.dateLabel !== label) {
        groups.push({ dateLabel: label, messages: [msg] });
      } else {
        last.messages.push(msg);
      }
    });
    return groups;
  };

  /* ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className={`cw-root ${minimized ? 'cw-minimized' : ''}`}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="cw-header">
        <div className="cw-header-left">
          <div className="cw-hdr-avatar">
            <img src={profileAvatar} alt={profile?.username} />
            {isConnected && <span className="cw-hdr-dot" />}
          </div>
          <div className="cw-hdr-info">
            <span className="cw-hdr-name">@{profile?.username}</span>
            <span className="cw-hdr-status">{isConnected ? 'En línea' : 'Hace un momento'}</span>
          </div>
        </div>
        <div className="cw-header-actions">
          {/* Call — disabled placeholder */}
          <button className="cw-hdr-btn" title="Llamada (próximamente)" disabled>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.12 2.18 2 2 0 012.1 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
          </button>
          {/* Video — disabled placeholder */}
          <button className="cw-hdr-btn" title="Videollamada (próximamente)" disabled>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </button>
          {/* Minimize */}
          <button className="cw-hdr-btn" title="Minimizar" onClick={() => setMinimized(m => !m)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              {minimized
                ? <path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
                : <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
              }
            </svg>
          </button>
          {/* Close */}
          <button className="cw-hdr-btn cw-hdr-close" title="Cerrar" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Body (hidden when minimized) ───────────────────────────────── */}
      {!minimized && (
        <>
          {/* ── Messages ─────────────────────────────────────────────── */}
          <div className="cw-messages" onClick={() => setPanel('none')}>
            {chatMessages.length === 0 ? (
              <div className="cw-empty">
                <img src={profileAvatar} alt="" className="cw-empty-avatar" />
                <p className="cw-empty-name">@{profile?.username}</p>
                <p className="cw-empty-hint">Sé el primero en escribir 👋</p>
              </div>
            ) : (
              groupedMessages().map((group, gi) => (
                <div key={gi} className="cw-group">
                  {group.dateLabel && (
                    <div className="cw-date-sep">
                      <span>{group.dateLabel}</span>
                    </div>
                  )}
                  {group.messages.map((msg, mi) => {
                    const mine = isMe(msg);
                    const isLast = mi === group.messages.length - 1;
                    const isLastOverall = gi === groupedMessages().length - 1 && isLast;
                    const showAvatar = !mine;
                    const isSticker = msg.type === 'sticker' || (!msg.content.startsWith('[') && /^\p{Emoji}/u.test(msg.content) && msg.content.length <= 4);

                    return (
                      <div key={msg.id ?? mi} className={`cw-row ${mine ? 'cw-row-mine' : 'cw-row-theirs'}`}>
                        {/* Avatar for other person */}
                        {showAvatar && (
                          <div className="cw-row-avatar">
                            {isLast
                              ? <img src={profileAvatar} alt="" />
                              : <span className="cw-row-avatar-ghost" />
                            }
                          </div>
                        )}

                        <div className="cw-bubble-col">
                          <div className={`cw-bubble ${mine ? 'cw-mine' : 'cw-theirs'} ${isSticker ? 'cw-bubble-sticker' : ''}`}>
                            {renderContent(msg)}
                          </div>
                          {/* Time on hover */}
                          {msg.createdAt && (
                            <span className={`cw-time ${mine ? 'cw-time-mine' : 'cw-time-theirs'}`}>
                              {formatTime(msg.createdAt)}
                            </span>
                          )}
                          {/* Seen indicator — only on last sent message */}
                          {mine && isLastOverall && (
                            <div className="cw-seen-row">
                              <img src={profileAvatar} alt="visto" className="cw-seen-avatar" />
                              <span className="cw-seen-label">Visto</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Image preview ─────────────────────────────────────────── */}
          {imagePreview && (
            <div className="cw-img-preview">
              <img src={imagePreview} alt="preview" />
              <div className="cw-img-preview-actions">
                <button className="cw-img-cancel" onClick={() => setImagePreview(null)}>Cancelar</button>
                <button className="cw-img-send" onClick={confirmSendImage}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  Enviar
                </button>
              </div>
            </div>
          )}

          {/* ── Sticker panel ─────────────────────────────────────────── */}
          {panel === 'stickers' && (
            <div className="cw-picker">
              <p className="cw-picker-title">Stickers</p>
              <div className="cw-sticker-grid">
                {STICKERS.map(s => (
                  <button key={s} className="cw-sticker-btn" onClick={() => sendSticker(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* ── GIF panel ─────────────────────────────────────────────── */}
          {panel === 'gif' && (
            <div className="cw-picker">
              <div className="cw-gif-search-row">
                <input
                  className="cw-gif-input"
                  value={gifQuery}
                  onChange={e => setGifQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchGifs(gifQuery)}
                  placeholder="Buscar GIF..."
                />
                <button className="cw-gif-go" onClick={() => searchGifs(gifQuery)}>Buscar</button>
              </div>
              {gifLoading
                ? <div className="cw-gif-loading">Buscando GIFs...</div>
                : (
                  <div className="cw-gif-grid">
                    {gifs.map(g => (
                      <button key={g.id} className="cw-gif-item" onClick={() => sendGif(g.images.fixed_height.url)}>
                        <img src={g.images.fixed_height.url} alt={g.title} loading="lazy" />
                      </button>
                    ))}
                    {gifs.length === 0 && <p className="cw-gif-none">No se encontraron GIFs</p>}
                  </div>
                )
              }
            </div>
          )}

          {/* ── Recording indicator ────────────────────────────────────── */}
          {recording && (
            <div className="cw-recording-bar">
              <span className="cw-rec-dot" />
              <span className="cw-rec-label">Grabando… {fmtSec(audioSec)}</span>
              <button className="cw-rec-stop" onClick={stopRecording}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                Detener
              </button>
            </div>
          )}

          {/* ── Input toolbar ─────────────────────────────────────────── */}
          <div className="cw-toolbar">
            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleImageFile} />

            {/* Mic */}
            <button
              className={`cw-tool-btn ${recording ? 'cw-tool-active' : ''}`}
              title={recording ? 'Detener grabación' : 'Grabar audio'}
              onClick={recording ? stopRecording : startRecording}
            >
              <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor">
                <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-7 9h2a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V21h-4v-2.08A7 7 0 0 1 5 12z"/>
              </svg>
            </button>

            {/* Photo */}
            <button className="cw-tool-btn" title="Enviar foto" onClick={() => fileInputRef.current?.click()}>
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>

            {/* Stickers */}
            <button
              className={`cw-tool-btn ${panel==='stickers' ? 'cw-tool-active' : ''}`}
              title="Stickers"
              onClick={() => setPanel(p => p === 'stickers' ? 'none' : 'stickers')}
            >
              <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm4.5 13.5a1 1 0 0 1-1.41 0L12 12.41l-3.09 3.09a1 1 0 0 1-1.41-1.41L10.59 11 7.5 7.91A1 1 0 1 1 8.91 6.5L12 9.59l3.09-3.09a1 1 0 0 1 1.41 1.41L13.41 11l3.09 3.09a1 1 0 0 1 0 1.41z"/>
              </svg>
              <span style={{fontSize:'0.7rem',fontWeight:900,position:'absolute',top:2,right:2,color:'inherit'}}>😊</span>
            </button>

            {/* GIF */}
            <button
              className={`cw-tool-btn cw-gif-btn ${panel==='gif' ? 'cw-tool-active' : ''}`}
              title="GIF"
              onClick={() => setPanel(p => p === 'gif' ? 'none' : 'gif')}
            >
              GIF
            </button>

            {/* Text input */}
            <div className="cw-input-wrap">
              <input
                ref={inputRef}
                type="text"
                className="cw-input"
                placeholder="Aa"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); }
                  setPanel('none');
                }}
                disabled={isSending || recording}
                maxLength={2000}
              />
            </div>

            {/* Send / Like */}
            {chatInput.trim() ? (
              <button
                className="cw-send-btn cw-send-active"
                onClick={sendText}
                disabled={isSending}
                aria-label="Enviar"
              >
                {isSending
                  ? <span className="cw-spinner" />
                  : (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  )
                }
              </button>
            ) : (
              <button className="cw-tool-btn cw-like-btn" title="Me gusta" onClick={sendLike}>
                👍
              </button>
            )}
          </div>
        </>
      )}

      {/* ─── Styles ────────────────────────────────────────────────────────── */}
      <style jsx>{`
        /* ROOT */
        .cw-root {
          width: 340px;
          display: flex;
          flex-direction: column;
          background: #1a1a2e;
          border-radius: 16px 16px 0 0;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow:
            0 -4px 30px rgba(0,0,0,0.6),
            0 0 0 0.5px rgba(255,255,255,0.05),
            0 0 40px rgba(8,102,255,0.1);
          animation: cwIn 0.32s cubic-bezier(0.16,1,0.3,1) both;
          transform-origin: bottom right;
          max-height: 520px;
        }
        .cw-minimized { max-height: unset; }
        @keyframes cwIn {
          from { opacity:0; transform: scale(0.9) translateX(12px); }
          to   { opacity:1; transform: scale(1) translateX(0); }
        }

        /* HEADER */
        .cw-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: linear-gradient(135deg,#0866ff 0%,#0099ff 55%,#5f00ff 100%);
          flex-shrink: 0;
          cursor: default;
          user-select: none;
        }
        .cw-header-left { display:flex; align-items:center; gap:10px; }
        .cw-hdr-avatar { position:relative; width:36px; height:36px; flex-shrink:0; }
        .cw-hdr-avatar img { width:100%; height:100%; border-radius:50%; object-fit:cover; border:2px solid rgba(255,255,255,0.35); }
        .cw-hdr-dot {
          position:absolute; bottom:1px; right:1px;
          width:9px; height:9px;
          background:#31a24c; border-radius:50%;
          border:2px solid #0866ff;
          box-shadow:0 0 5px rgba(49,162,76,0.8);
        }
        .cw-hdr-info { display:flex; flex-direction:column; }
        .cw-hdr-name { font-size:0.88rem; font-weight:800; color:white; line-height:1.2; }
        .cw-hdr-status { font-size:0.68rem; color:rgba(255,255,255,0.75); }
        .cw-header-actions { display:flex; gap:3px; }
        .cw-hdr-btn {
          width:28px; height:28px; border-radius:50%;
          background:rgba(255,255,255,0.15);
          border:none; color:white; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          transition:background 0.18s; flex-shrink:0;
        }
        .cw-hdr-btn:hover:not(:disabled) { background:rgba(255,255,255,0.28); }
        .cw-hdr-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .cw-hdr-close:hover { background:rgba(255,60,60,0.35) !important; }

        /* MESSAGES */
        .cw-messages {
          flex:1; overflow-y:auto;
          padding:12px 10px 8px;
          display:flex; flex-direction:column; gap:2px;
          scroll-behavior:smooth;
          min-height:0;
          max-height:340px;
        }
        .cw-messages::-webkit-scrollbar { width:3px; }
        .cw-messages::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }

        /* Empty state */
        .cw-empty {
          display:flex; flex-direction:column; align-items:center;
          justify-content:center; gap:10px; padding:50px 20px; flex:1;
        }
        .cw-empty-avatar { width:60px; height:60px; border-radius:50%; object-fit:cover; border:3px solid rgba(8,102,255,0.3); box-shadow:0 0 20px rgba(8,102,255,0.15); }
        .cw-empty-name { font-size:0.92rem; font-weight:800; color:#ddd; margin:0; }
        .cw-empty-hint { font-size:0.8rem; color:rgba(255,255,255,0.3); margin:0; }

        /* Date separator */
        .cw-group { display:flex; flex-direction:column; gap:2px; }
        .cw-date-sep {
          display:flex; align-items:center; justify-content:center;
          padding:8px 0 4px; position:relative;
        }
        .cw-date-sep span {
          font-size:0.65rem; color:rgba(255,255,255,0.3);
          background:#1a1a2e; padding:2px 10px; border-radius:20px;
          border:1px solid rgba(255,255,255,0.06);
        }

        /* Message rows */
        .cw-row {
          display:flex; align-items:flex-end; gap:6px;
          animation: msgIn 0.2s ease-out both;
        }
        @keyframes msgIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .cw-row-mine { flex-direction:row-reverse; }
        .cw-row-theirs { flex-direction:row; }

        /* Avatars */
        .cw-row-avatar { width:26px; flex-shrink:0; }
        .cw-row-avatar img { width:26px; height:26px; border-radius:50%; object-fit:cover; }
        .cw-row-avatar-ghost { display:block; width:26px; height:26px; }

        /* Bubble column */
        .cw-bubble-col { display:flex; flex-direction:column; gap:1px; max-width:72%; }
        .cw-row-mine .cw-bubble-col { align-items:flex-end; }
        .cw-row-theirs .cw-bubble-col { align-items:flex-start; }

        /* Bubbles */
        .cw-bubble {
          padding:8px 14px;
          border-radius:20px;
          font-size:0.87rem; line-height:1.45;
          word-break:break-word;
          max-width:100%;
          position:relative;
        }
        .cw-mine {
          background:linear-gradient(135deg,#0866ff,#5f00ff);
          color:white;
          border-bottom-right-radius:4px;
          box-shadow:0 2px 10px rgba(8,102,255,0.35);
        }
        .cw-theirs {
          background:rgba(255,255,255,0.08);
          color:#e8e8e8;
          border-bottom-left-radius:4px;
          border:1px solid rgba(255,255,255,0.07);
        }
        .cw-bubble-sticker {
          background:transparent !important;
          border:none !important;
          box-shadow:none !important;
          padding:0 !important;
        }
        .cw-sticker { font-size:2.2rem; line-height:1; }
        .cw-bubble-img {
          max-width:200px; max-height:200px;
          border-radius:12px; object-fit:cover;
          cursor:pointer; display:block;
        }
        .cw-bubble-audio { width:200px; height:36px; }

        /* Time */
        .cw-time {
          font-size:0.6rem; color:rgba(255,255,255,0.22);
          padding:0 4px; display:none;
        }
        .cw-row:hover .cw-time { display:block; }
        .cw-time-mine { text-align:right; }
        .cw-time-theirs { text-align:left; }

        /* Seen */
        .cw-seen-row { display:flex; align-items:center; gap:4px; margin-top:2px; justify-content:flex-end; }
        .cw-seen-avatar { width:14px; height:14px; border-radius:50%; object-fit:cover; opacity:0.7; }
        .cw-seen-label { font-size:0.62rem; color:rgba(255,255,255,0.3); }

        /* Image preview */
        .cw-img-preview {
          padding:10px 14px;
          background:rgba(0,0,0,0.3);
          border-top:1px solid rgba(255,255,255,0.05);
          display:flex; flex-direction:column; gap:8px; align-items:flex-start;
        }
        .cw-img-preview img { max-height:140px; border-radius:10px; object-fit:cover; }
        .cw-img-preview-actions { display:flex; gap:8px; }
        .cw-img-cancel {
          background:rgba(255,255,255,0.08); border:none; color:#aaa;
          padding:6px 14px; border-radius:8px; font-size:0.8rem; cursor:pointer;
          transition:0.2s; font-weight:700;
        }
        .cw-img-cancel:hover { background:rgba(255,255,255,0.15); color:white; }
        .cw-img-send {
          background:linear-gradient(135deg,#0866ff,#5f00ff);
          border:none; color:white;
          padding:6px 16px; border-radius:8px; font-size:0.8rem;
          cursor:pointer; display:flex; align-items:center; gap:6px;
          font-weight:800; transition:0.2s;
        }
        .cw-img-send:hover { transform:scale(1.03); box-shadow:0 4px 14px rgba(8,102,255,0.5); }

        /* Panels (stickers / gif) */
        .cw-picker {
          border-top:1px solid rgba(255,255,255,0.06);
          background:rgba(0,0,0,0.25);
          padding:10px;
          max-height:200px;
          overflow-y:auto;
          flex-shrink:0;
        }
        .cw-picker::-webkit-scrollbar { width:3px; }
        .cw-picker::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
        .cw-picker-title { font-size:0.7rem; font-weight:900; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:1px; margin:0 0 8px; }
        .cw-sticker-grid { display:grid; grid-template-columns:repeat(8,1fr); gap:4px; }
        .cw-sticker-btn {
          background:none; border:none; font-size:1.6rem; cursor:pointer;
          border-radius:8px; transition:background 0.15s; padding:4px;
          display:flex; align-items:center; justify-content:center;
        }
        .cw-sticker-btn:hover { background:rgba(255,255,255,0.1); }

        /* GIF */
        .cw-gif-search-row { display:flex; gap:6px; margin-bottom:8px; }
        .cw-gif-input {
          flex:1; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1);
          border-radius:10px; padding:6px 10px; color:white; font-size:0.82rem; outline:none;
        }
        .cw-gif-input:focus { border-color:rgba(8,102,255,0.5); }
        .cw-gif-go {
          background:#0866ff; border:none; color:white; border-radius:10px;
          padding:6px 12px; font-size:0.8rem; font-weight:800; cursor:pointer;
          transition:0.2s;
        }
        .cw-gif-go:hover { background:#0755d4; }
        .cw-gif-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:4px; }
        .cw-gif-item {
          background:none; border:none; cursor:pointer; padding:0; border-radius:8px; overflow:hidden;
          aspect-ratio:1; transition:transform 0.15s;
        }
        .cw-gif-item:hover { transform:scale(1.03); }
        .cw-gif-item img { width:100%; height:100%; object-fit:cover; display:block; }
        .cw-gif-loading { text-align:center; color:rgba(255,255,255,0.3); font-size:0.82rem; padding:20px; }
        .cw-gif-none { text-align:center; color:rgba(255,255,255,0.25); font-size:0.82rem; padding:20px; }

        /* Recording bar */
        .cw-recording-bar {
          display:flex; align-items:center; gap:10px;
          padding:8px 14px;
          background:rgba(239,68,68,0.1);
          border-top:1px solid rgba(239,68,68,0.2);
          flex-shrink:0;
        }
        .cw-rec-dot {
          width:8px; height:8px; border-radius:50%; background:#ef4444;
          animation:recPulse 0.9s ease-in-out infinite;
        }
        @keyframes recPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .cw-rec-label { flex:1; font-size:0.82rem; font-weight:700; color:#ef4444; }
        .cw-rec-stop {
          background:rgba(239,68,68,0.2); border:1px solid rgba(239,68,68,0.3);
          color:#ef4444; border-radius:8px; padding:4px 10px; font-size:0.75rem;
          font-weight:800; cursor:pointer; display:flex; align-items:center; gap:5px;
          transition:0.2s;
        }
        .cw-rec-stop:hover { background:rgba(239,68,68,0.35); }

        /* TOOLBAR */
        .cw-toolbar {
          display:flex; align-items:center; gap:4px;
          padding:8px 10px;
          background:rgba(0,0,0,0.2);
          border-top:1px solid rgba(255,255,255,0.05);
          flex-shrink:0;
        }
        .cw-tool-btn {
          width:34px; height:34px; border-radius:50%;
          background:transparent; border:none;
          color:rgba(255,255,255,0.45);
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          transition:all 0.18s; flex-shrink:0; font-size:1rem;
          position:relative;
        }
        .cw-tool-btn:hover { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.8); }
        .cw-tool-active { color:#0866ff !important; }
        .cw-gif-btn {
          font-size:0.72rem; font-weight:900; letter-spacing:-0.5px;
          border:1.5px solid rgba(255,255,255,0.2); border-radius:8px;
          padding:0 6px; width:auto; height:26px;
        }
        .cw-like-btn { font-size:1.2rem; }

        /* Input */
        .cw-input-wrap {
          flex:1; min-width:0;
          background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:20px;
          padding:6px 14px;
          transition:border-color 0.2s, box-shadow 0.2s;
        }
        .cw-input-wrap:focus-within {
          border-color:rgba(8,102,255,0.4);
          box-shadow:0 0 0 3px rgba(8,102,255,0.07);
        }
        .cw-input {
          width:100%; background:none; border:none; outline:none;
          color:#eee; font-size:0.88rem; font-family:inherit;
        }
        .cw-input::placeholder { color:rgba(255,255,255,0.22); }

        /* Send button */
        .cw-send-btn {
          width:34px; height:34px; border-radius:50%; border:none;
          background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.3);
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          transition:all 0.2s; flex-shrink:0;
        }
        .cw-send-active {
          background:linear-gradient(135deg,#0866ff,#5f00ff) !important;
          color:white !important; box-shadow:0 3px 12px rgba(8,102,255,0.45);
        }
        .cw-send-active:hover { transform:scale(1.08); box-shadow:0 4px 16px rgba(8,102,255,0.6); }
        .cw-send-active:disabled { opacity:0.6; transform:none; }

        /* Spinner */
        .cw-spinner {
          display:block; width:14px; height:14px;
          border:2px solid rgba(255,255,255,0.3); border-top-color:white;
          border-radius:50%; animation:spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
};

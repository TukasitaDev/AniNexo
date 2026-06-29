'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';

interface Message {
  id: number;
  sender: 'user' | 'nexo';
  text: string;
}

export default function NexoChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'nexo', text: '¡Hola! Soy Nexo, tu asistente otaku personal. ¿Qué anime quieres analizar hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      try {
        const parsed = JSON.parse(u);
        if (parsed?.id) setUserId(parsed.id);
      } catch (e) {
        console.error('Error parsing user from localStorage', e);
      }
    }
  }, []);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/nexo/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: userId || 'cf7c92fe-efc5-483b-b195-46c515bf6d43', 
          message: userMessage 
        })
      });

      const data = await res.json();
      
      if (res.status === 429 || data.action === 'UPGRADE_REQUIRED') {
        setMessages(prev => [...prev, { id: Date.now(), sender: 'nexo', text: data.message }]);
      } else if (data.success) {
        setMessages(prev => [...prev, { id: Date.now(), sender: 'nexo', text: data.data.reply }]);
      } else {
        setMessages(prev => [...prev, { id: Date.now(), sender: 'nexo', text: 'Mmm, tuve un problema interno. Intenta de nuevo.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now(), sender: 'nexo', text: 'Error de conexión con mis servidores.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header del Chat */}
      <div style={{ 
        padding: '1.5rem 1rem', 
        borderBottom: '1px solid var(--color-secondary)',
        background: 'linear-gradient(90deg, #181818, #2a0845)'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#00E5FF', boxShadow: '0 0 8px #00E5FF'
          }}></div>
          Nexo AI
        </h2>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
          Conectado (Gemini)
        </p>
      </div>

      {/* Área de Mensajes */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            backgroundColor: msg.sender === 'user' ? 'var(--color-primary)' : 'var(--color-surface-hover)',
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            borderBottomRightRadius: msg.sender === 'user' ? '0' : '12px',
            borderBottomLeftRadius: msg.sender === 'nexo' ? '0' : '12px',
            lineHeight: '1.4',
            fontSize: '0.9rem'
          }}>
            {msg.text}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
            Nexo está pensando...
          </div>
        )}
      </div>

      {/* Input de Chat */}
      <div style={{ padding: '1rem', borderTop: '1px solid var(--color-secondary)' }}>
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ flex: 1 }}>
            <Input 
              type="text" 
              placeholder="Pregúntame algo..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              label=""
            />
          </div>
          <div style={{ marginTop: '0.25rem' }}>
            <Button variant="primary" size="md" disabled={loading}>→</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

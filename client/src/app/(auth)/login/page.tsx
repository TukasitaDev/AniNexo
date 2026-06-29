'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; general?: string }>({});

  const FORBIDDEN_CHARS = /[><=&\/]/;

  const handleIdentifierChange = (val: string) => {
    setIdentifier(val);
    setErrors(prev => {
      const updated = { ...prev, general: undefined };
      if (FORBIDDEN_CHARS.test(val)) {
        updated.identifier = 'Contiene caracteres prohibidos (> < = & /)';
      } else {
        delete updated.identifier;
      }
      return updated;
    });
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    setErrors(prev => {
      const updated = { ...prev, general: undefined };
      if (FORBIDDEN_CHARS.test(val)) {
        updated.password = 'Contiene caracteres prohibidos (> < = & /)';
      } else {
        delete updated.password;
      }
      return updated;
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (FORBIDDEN_CHARS.test(identifier) || FORBIDDEN_CHARS.test(password)) {
      setErrors(prev => ({ ...prev, general: 'Corrige los errores antes de continuar.' }));
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();
      if (data.success) {
        // En Express, el token viene en la cookie httpOnly. Pero por retrocompatibilidad con la app existente
        // guardamos el token si viene en la respuesta o en cookies.
        const token = data.accessToken || data.data?.token;
        if (token) localStorage.setItem('token', token);
        
        const userObj = data.user || data.data?.user;
        if (userObj) localStorage.setItem('user', JSON.stringify(userObj));
        
        // Redirección inteligente por rol
        const role = userObj?.role;
        if (role === 'ADMIN' || role === 'SUPERADMIN') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/dashboard/community';
        }
      } else {
        setErrors(prev => ({
          ...prev,
          general: data.errors?.[0] || data.message || 'Correo o contraseña incorrectos.'
        }));
      }
    } catch (e) {
      console.error(e);
      setErrors(prev => ({ ...prev, general: 'Error de conexión con el servidor.' }));
    } finally {
      setLoading(false);
    }
  };

  const hasErrors = !!(errors.identifier || errors.password);

  return (
    <main className="login-split-page">
      {/* Lado Izquierdo: Imagen de Nexo */}
      <section className="image-side">
        <div className="nexo-image-container">
           <img src="/nexo-login.png" alt="Nexo" className="nexo-bg" />
           <div className="image-overlay"></div>
           <div className="image-text">
             <p>Explora el mundo del anime como nunca antes.</p>
             <p>Descubre personajes, historias y habla con tu personaje favorito.</p>
           </div>
        </div>
      </section>

      {/* Lado Derecho: Formulario */}
      <section className="form-side">
        <div className="login-card">
          <h1 className="login-title">Iniciar sesión</h1>
          
          {errors.general && (
            <div className="error-msg-general">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleLogin} className="auth-form">
            <div className="input-group">
              <input 
                type="text" 
                placeholder="Correo o Usuario" 
                value={identifier}
                onChange={(e) => handleIdentifierChange(e.target.value)}
                required
                style={{ borderColor: errors.identifier ? '#ff4d4d' : undefined }}
              />
              {errors.identifier && <span className="field-error">{errors.identifier}</span>}
            </div>

            <div className="input-group password-group">
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Contraseña" 
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
                style={{ borderColor: errors.password ? '#ff4d4d' : undefined }}
              />
              <span className="eye-icon" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '🙈' : '👁️'}
              </span>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <button type="submit" className="login-btn" disabled={loading || hasErrors}>
              {loading ? 'Cargando...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="signup-link">
            ¿No tienes cuenta? <Link href="/register">Crear cuenta</Link>
          </p>
        </div>
      </section>

      <style jsx>{`
        .login-split-page {
          display: flex;
          height: 100vh;
          width: 100vw;
          background-color: #050505;
          overflow: hidden;
        }

        /* Lado de la Imagen */
        .image-side {
          flex: 1;
          position: relative;
        }

        .nexo-image-container {
          height: 100%;
          width: 100%;
        }

        .nexo-bg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top;
        }

        .image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(-90deg, #050505 0%, transparent 40%),
                      linear-gradient(0deg, #050505 0%, transparent 30%);
        }

        .image-text {
          position: absolute;
          bottom: 40px;
          left: 40px;
          text-align: left;
          max-width: 400px;
          color: #888;
          font-size: 0.9rem;
          line-height: 1.5;
          animation: fadeIn 1s ease 0.5s both;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Lado del Formulario */
        .form-side {
          flex: 0 0 45%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }

        .login-card {
          width: 100%;
          max-width: 380px;
          padding: 40px;
          background: rgba(15, 15, 15, 0.4);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(20px);
        }

        .login-title {
          color: #00E5FF;
          font-size: 2rem;
          font-weight: 900;
          margin-bottom: 30px;
          letter-spacing: -0.5px;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .input-group input {
          width: 100%;
          padding: 16px 20px;
          background: #11141D;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          color: white;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s;
        }

        .input-group input:focus {
          border-color: #00E5FF;
          background: #161a25;
        }

        .field-error {
          color: #ff4d4d;
          font-size: 0.75rem;
          margin-top: 5px;
          display: block;
          text-align: left;
        }

        .error-msg-general {
          background: rgba(255, 77, 77, 0.1);
          border: 1px solid rgba(255, 77, 77, 0.2);
          color: #ff4d4d;
          padding: 12px;
          border-radius: 12px;
          margin-bottom: 20px;
          text-align: center;
          font-size: 0.85rem;
        }

        .password-group {
          position: relative;
        }

        .eye-icon {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0.5;
          cursor: pointer;
        }

        .login-btn {
          margin-top: 10px;
          background: #00E5FF;
          color: #000;
          padding: 16px;
          border-radius: 12px;
          border: none;
          font-weight: 900;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .login-btn:hover {
          background: #00f2ff;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0, 229, 255, 0.2);
        }

        .signup-link {
          margin-top: 25px;
          text-align: center;
          color: #888;
          font-size: 0.9rem;
        }

        .signup-link :global(a) {
          color: #00E5FF;
          text-decoration: none;
          font-weight: bold;
        }

        @media (max-width: 1000px) {
          .image-side { display: none; }
          .form-side { flex: 1; }
        }
      `}</style>
    </main>
  );
}

'use client';

import React from 'react';
import { NexoAlert } from '../../../components/ui/NexoAlert';

export default function ManualPage() {
  return (
    <div className="manual-container">
      <div className="manual-header">
        <h1 className="manual-title">📖 Manual del Sistema — AniNexo</h1>
        <p className="manual-subtitle">Guía de usuario para explorar, interactuar y disfrutar de la plataforma</p>
      </div>

      <div className="manual-content">
        {/* Seccion 1 */}
        <section className="manual-section">
          <h2>🌟 1. Vista General del Tablero</h2>
          <p>
            En la página de inicio del Dashboard tendrás acceso a las mejores novedades del mundo del anime y manga:
          </p>
          <ul>
            <li><strong>Tendencias Globales:</strong> Los animes con mayor interacción y visualizaciones en tiempo real.</li>
            <li><strong>Novedades de Mangas:</strong> Una selección de mangas populares directamente desde MangaDex.</li>
            <li><strong>Historial Reciente:</strong> Tus animes vistos recientemente para continuar justo donde lo dejaste.</li>
          </ul>
        </section>

        {/* Seccion 2 */}
        <section className="manual-section">
          <h2>📖 2. Búsqueda y Lectura de Manga</h2>
          <p>
            AniNexo cuenta con una integración completa con <strong>MangaDex</strong>:
          </p>
          <ul>
            <li>Al buscar un anime o entrar a sus detalles, verás la pestaña de <strong>"Leer Manga"</strong>.</li>
            <li>Si el manga está disponible, un punto verde 🟢 lo indicará. Podrás acceder directamente a la lista de capítulos.</li>
            <li>El lector de manga carga los capítulos en un modo cascada óptimo para una lectura inmersiva.</li>
          </ul>
        </section>

        {/* Seccion 3 */}
        <section className="manual-section">
          <h2>🤖 3. IA Nexo (Tu Asistente Virtual)</h2>
          <p>
            En la sección <strong>IA Nexo</strong> o el chat flotante, puedes hablar de forma interactiva sobre cualquier anime, pedir recomendaciones inteligentes y conversar sobre géneros u opiniones con nuestra IA entrenada.
          </p>
        </section>

        {/* Seccion 4 */}
        <section className="manual-section">
          <h2>🔔 4. Notificaciones en Tiempo Real</h2>
          <p>
            El botón de la campana en la barra superior te mantendrá al tanto de la actividad:
          </p>
          <ul>
            <li>Likes, comentarios o compartidos de tus publicaciones en el feed social.</li>
            <li>Solicitudes de amistad recibidas, las cuales puedes aceptar o ignorar directamente desde el panel de notificaciones.</li>
          </ul>
        </section>

        {/* Seccion 5 */}
        <section className="manual-section">
          <h2>⚙️ 5. Personalización y Ajustes</h2>
          <p>
            En tu perfil y en la sección de Ajustes (icono de engranaje) puedes cambiar tu avatar, actualizar tu información y gestionar tu contraseña para mantener tu cuenta segura.
          </p>
        </section>
      </div>

      <style jsx>{`
        .manual-container {
          max-width: 900px;
          margin: 40px auto;
          padding: 30px;
          background: rgba(15, 15, 20, 0.6);
          border: 1px solid rgba(0, 229, 255, 0.15);
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          color: #eee;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .manual-header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 20px;
        }

        .manual-title {
          font-size: 2.2rem;
          color: #00E5FF;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin-bottom: 10px;
          text-shadow: 0 0 15px rgba(0, 229, 255, 0.3);
        }

        .manual-subtitle {
          color: #888;
          font-size: 1.1rem;
        }

        .manual-content {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .manual-section {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: transform 0.2s, border-color 0.2s;
        }

        .manual-section:hover {
          transform: translateY(-2px);
          border-color: rgba(0, 229, 255, 0.3);
          background: rgba(255, 255, 255, 0.03);
        }

        .manual-section h2 {
          color: #00E5FF;
          font-size: 1.35rem;
          margin-top: 0;
          margin-bottom: 15px;
          font-weight: 700;
        }

        .manual-section p {
          line-height: 1.6;
          color: #ccc;
          margin-bottom: 10px;
        }

        .manual-section ul {
          margin: 0;
          padding-left: 20px;
          color: #bbb;
        }

        .manual-section li {
          margin-bottom: 8px;
          line-height: 1.5;
        }

        .manual-section li strong {
          color: #fff;
        }
      `}</style>
    </div>
  );
}

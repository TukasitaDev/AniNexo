'use client';

import React from 'react';

export default function ManualPage() {
  return (
    <div className="manual-container">
      <div className="manual-header">
        <h1 className="manual-title">📖 Manual Completo del Sistema — AniNexo</h1>
        <p className="manual-subtitle">Guía definitiva de usuario para explorar, interactuar y personalizar tu experiencia</p>
      </div>

      <div className="manual-content">
        {/* Seccion 1 */}
        <section className="manual-section">
          <h2>🌟 1. Exploración y Feed Principal (Dashboard)</h2>
          <p>
            Al ingresar al dashboard de AniNexo, te encuentras con la central de descubrimiento dinámico. Las secciones clave son:
          </p>
          <ul>
            <li><strong>Carrusel Principal (Hero):</strong> Muestra los animes en tendencia global en tiempo real. Incluye detalles de su estudio de animación, año de emisión, compatibilidad, y botones directos para agregarlo a tu lista o ver detalles.</li>
            <li><strong>Filas de Descubrimiento:</strong> Listado inteligente dividido en categorías autogestionadas como <em>Tendencias Globales</em>, <em>Los Más Populares</em>, <em>Mejor Valorados</em> y <em>Próximos Estrenos</em>.</li>
            <li><strong>Historial Reciente:</strong> Fila dinámica que detecta los últimos animes visualizados y te permite reanudar su reproducción inmediatamente en un clic.</li>
            <li><strong>Novedades de Mangas:</strong> Una selección exclusiva conectada a la base de datos de MangaDex con sus portadas oficiales e información clave de autores.</li>
          </ul>
        </section>

        {/* Seccion 2 */}
        <section className="manual-section">
          <h2>📖 2. Búsqueda Global Integrada y Filtros</h2>
          <p>
            El sistema cuenta con un motor de búsqueda unificado localizado en la barra superior o en la vista de búsqueda detallada:
          </p>
          <ul>
            <li>Puedes buscar por títulos en <strong>Romaji, Inglés o Japonés</strong>.</li>
            <li>Permite filtrar dinámicamente entre resultados de <strong>Anime</strong> y <strong>Manga</strong> usando el conmutador interactivo.</li>
            <li>Las sugerencias en tiempo real muestran el formato (TV, Película, OVA) y la puntuación promedio del anime directamente bajo el cuadro de búsqueda.</li>
          </ul>
        </section>

        {/* Seccion 3 */}
        <section className="manual-section">
          <h2>📚 3. Ficha Técnica y Lector de Manga</h2>
          <p>
            Cada obra posee una ficha exhaustiva con información traducida en tiempo real y opciones avanzadas de lectura:
          </p>
          <ul>
            <li><strong>Pestañas del Anime:</strong> Puedes alternar entre <em>Vista General</em> (Sinopsis oficial en español, obras relacionadas y recomendaciones del mismo género), <em>Personajes</em> (Sección de elenco con actores de voz japoneses), <em>Staff</em> (Equipo de producción principal), <em>Estadísticas</em> y la pestaña social.</li>
            <li><strong>Pestaña "Leer Manga" (MangaDex):</strong> AniNexo consulta en caliente la disponibilidad de capítulos. Si está disponible, se muestra un indicador verde 🟢 en la pestaña.</li>
            <li><strong>El Lector Cascada:</strong> Al seleccionar un capítulo, la interfaz de lectura se optimiza para ocultar distracciones. Las páginas se cargan de forma secuencial y responsiva, permitiéndote avanzar cómodamente en dispositivos móviles o de escritorio.</li>
          </ul>
        </section>

        {/* Seccion 4 */}
        <section className="manual-section">
          <h2>🤖 4. IA Nexo y Redes de Interacción Social</h2>
          <p>
            La plataforma va más allá de un catálogo tradicional integrando funciones de comunidad inteligente:
          </p>
          <ul>
            <li><strong>Chat Virtual de IA Nexo:</strong> Un chat impulsado por Inteligencia Artificial en el que puedes discutir teorías, pedir recomendaciones personalizadas basadas en tus gustos, o debatir sobre finales de anime.</li>
            <li><strong>Feed Social:</strong> Publica tus opiniones, comparte contenido multimedia, etiqueta tus animes favoritos usando menciones automáticas y recibe likes o comentarios de tus amigos.</li>
            <li><strong>Grupos Temáticos:</strong> Únete o crea comunidades enfocadas en géneros específicos o franquicias completas directamente desde la ficha de tu anime preferido.</li>
          </ul>
        </section>

        {/* Seccion 5 */}
        <section className="manual-section">
          <h2>🔔 5. Centro de Notificaciones y Amigos</h2>
          <p>
            Administra tus interacciones en tiempo real desde la campana inteligente de 36px en la barra de navegación:
          </p>
          <ul>
            <li><strong>Notificaciones de interacción:</strong> Recibe alertas instantáneas con avatares de usuarios cuando reaccionan a tus publicaciones, comentan tu contenido o te siguen.</li>
            <li><strong>Gestión de Amistad Directa:</strong> Las solicitudes de amistad entrantes se listan directamente en el panel flotante de la campana. Puedes aceptarlas o ignorarlas sin salir de la página actual.</li>
            <li><strong>Modal de Amigos:</strong> Acceso rápido a tu lista de contactos activos, búsqueda de nuevos usuarios y chat directo en tiempo real.</li>
          </ul>
        </section>

        {/* Seccion 6 */}
        <section className="manual-section">
          <h2>⚙️ 6. Ajustes de la Cuenta y Seguridad</h2>
          <p>
            Gestiona la seguridad y estética de tu perfil en la sección de Ajustes accesible desde el menú de usuario:
          </p>
          <ul>
            <li><strong>Información del Perfil:</strong> Cambia tu nombre para mostrar, edita tu biografía, y actualiza tu ubicación o avatar.</li>
            <li><strong>Seguridad de Cuenta:</strong> Actualiza tu contraseña verificando tu clave anterior de forma encriptada.</li>
            <li><strong>Preferencia de Idioma:</strong> Toda la información de títulos, formatos (Serie, Película), estados (En emisión, Finalizado) y sinopsis se mostrarán automáticamente en español gracias a la traducción en tiempo real de AniNexo.</li>
          </ul>
        </section>
      </div>

      <style jsx>{`
        .manual-container {
          max-width: 900px;
          margin: 40px auto;
          padding: 40px;
          background: rgba(10, 10, 12, 0.7);
          border: 1px solid rgba(0, 229, 255, 0.2);
          border-radius: 24px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(12px);
          color: #eee;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .manual-header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 30px;
        }

        .manual-title {
          font-size: 2.4rem;
          color: #00E5FF;
          font-weight: 900;
          letter-spacing: -0.5px;
          margin-bottom: 12px;
          text-shadow: 0 0 20px rgba(0, 229, 255, 0.35);
        }

        .manual-subtitle {
          color: #aaa;
          font-size: 1.15rem;
        }

        .manual-content {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .manual-section {
          background: rgba(255, 255, 255, 0.015);
          border-radius: 16px;
          padding: 25px;
          border: 1px solid rgba(255, 255, 255, 0.04);
          transition: transform 0.2s, border-color 0.2s, background 0.2s;
        }

        .manual-section:hover {
          transform: translateY(-2px);
          border-color: rgba(0, 229, 255, 0.35);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
        }

        .manual-section h2 {
          color: #00E5FF;
          font-size: 1.45rem;
          margin-top: 0;
          margin-bottom: 15px;
          font-weight: 800;
        }

        .manual-section p {
          line-height: 1.7;
          color: #ccc;
          margin-bottom: 15px;
        }

        .manual-section ul {
          margin: 0;
          padding-left: 20px;
          color: #bbb;
        }

        .manual-section li {
          margin-bottom: 10px;
          line-height: 1.6;
        }

        .manual-section li strong {
          color: #fff;
        }
      `}</style>
    </div>
  );
}

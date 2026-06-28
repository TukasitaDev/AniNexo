'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ViewTransition } from 'react';
import { Users, Menu, X as CloseIcon } from 'lucide-react';
import { FriendsModal } from '../profile/FriendsModal';
import { NotificationDropdown } from './NotificationDropdown';
import styles from './TopNavbar.module.css';

export const TopNavbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ animes: any[], users: any[] }>({ animes: [], users: [] });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const pathname = usePathname();
  const searchRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    const u = localStorage.getItem('user');
    if (u) {
      try {
        setUser(JSON.parse(u));
      } catch (e) {
        console.error("Error parsing user from localStorage", e);
      }
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setShowSearchResults(false);
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSearchResults(false);
        setShowDropdown(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (searchQuery.length < 2) {
        setSearchResults({ animes: [], users: [] });
        setShowSearchResults(false);
        return;
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/search/global?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.data);
          setShowSearchResults(true);
        }
      } catch (err) {
        console.error("Search error", err);
      }
    };

    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const navLinks = [
    { name: 'Inicio', href: '/dashboard' },
    { name: 'Búsqueda', href: '/dashboard/search' },
    { name: 'Ver Anime', href: '/dashboard/watch' },
    { name: 'Comunidad', href: '/dashboard/community' },
    { name: 'IA Nexo', href: '/dashboard/nexo' },
    { name: 'Premium', href: '/dashboard/premium' },
  ];

  const handleGlobalSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = (e.target as HTMLInputElement).value;
      window.location.href = `/dashboard/search?query=${encodeURIComponent(query)}`;
    }
  };

  return (
    <nav className={`${styles.topNavbar} ${scrolled ? styles.scrolled : ''}`} role="navigation" aria-label="Navegación principal">
      <div className={styles.navLeft}>
        <Link href="/dashboard" className={styles.logo}>ANINEXO</Link>
        <div className={styles.navLinks} role="menubar">
          {navLinks.map((link) => {
            const tourId = `nav-${link.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-')}`;
            return (
              <Link 
                key={link.href} 
                href={link.href} 
                className={`${styles.navLink} ${pathname === link.href ? styles.navLinkActive : ''}`}
                role="menuitem"
                data-tour={tourId}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>

      <div className={styles.navRight}>
        <div className={styles.searchBox} ref={searchRef} data-tour="search-box">
           <input 
             type="text" 
             placeholder="Buscar anime o personas..." 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
             onKeyDown={handleGlobalSearch}
             className={styles.searchInput}
             aria-label="Buscar anime o personas"
           />
           <span className={styles.searchIcon} aria-hidden="true">🔍</span>

           {showSearchResults && (searchQuery.length >= 2) && (
             <ViewTransition>
               <div className={styles.searchResults} role="listbox" aria-label="Resultados de búsqueda">
                 {searchResults.animes.length > 0 && (
                   <div className={styles.searchSection}>
                     <p className={styles.sectionTitle}>Animes</p>
                       {searchResults.animes.map(anime => {
                         const slug = anime.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                         return (
                           <Link key={anime.id} href={`/dashboard/anime/${anime.id}-${slug}`} className={styles.searchResultItem} onClick={() => setShowSearchResults(false)} role="option">
                         <img src={anime.coverImage} alt={anime.title} className={styles.resImg} />
                         <div className={styles.resInfo}>
                           <p className={styles.resTitle}>{anime.title}</p>
                           <p className={styles.resMeta}>{anime.format} • ⭐ {anime.meanScore}%</p>
                         </div>
                           </Link>
                         );
                       })}
                   </div>
                 )}

                 {searchResults.users.length > 0 && (
                   <div className={styles.searchSection}>
                     <p className={styles.sectionTitle}>Personas</p>
                     {searchResults.users.map(u => (
                       <Link key={u.id} href={`/dashboard/profile/${u.username}`} className={styles.searchResultItem} onClick={() => setShowSearchResults(false)} role="option">
                         <img 
                           src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=random&color=fff`} 
                           alt={u.username} 
                           className={styles.resAvatar}
                         />
                         <div className={styles.resInfo}>
                           <p className={styles.resTitle}>@{u.username}</p>
                           <p className={styles.resMeta}>{u.archetype || 'Explorador'}</p>
                         </div>
                       </Link>
                     ))}
                   </div>
                 )}

                 {searchResults.animes.length === 0 && searchResults.users.length === 0 && (
                   <p className={styles.noResults}>No se encontraron resultados para &quot;{searchQuery}&quot;</p>
                 )}
               </div>
             </ViewTransition>
           )}
        </div>
        
        <div className={styles.iconGroup}>
            <Link href="/dashboard/premium" className={styles.premiumLink}>PREMIUM</Link>
            <button className={styles.navIconBtn} onClick={() => setShowFriendsModal(true)} title="Ver amigos" aria-label="Ver amigos">
              <Users size={18} />
            </button>
            <NotificationDropdown />

            {showFriendsModal && user && (
               <FriendsModal
                 userId={user.id}
                 onClose={() => setShowFriendsModal(false)}
                 currentUser={user}
               />
            )}

            <div className={styles.userMenu} ref={menuRef}>
             <div 
               className={styles.userAvatar} 
               onClick={() => setShowDropdown(!showDropdown)}
               role="button"
               tabIndex={0}
               aria-expanded={showDropdown}
               aria-haspopup="menu"
               onKeyDown={(e) => e.key === 'Enter' && setShowDropdown(!showDropdown)}
               data-tour="user-avatar"
             >
               {user?.avatarUrl ? <img src={user.avatarUrl} alt="Usuario" /> : <span>{user?.username?.charAt(0) || 'U'}</span>}
             </div>

             {showDropdown && (
               <ViewTransition>
                 <div 
                   className={styles.userDropdown}
                   role="menu"
                   aria-label="Menú de usuario"
                 >
                    <div className={styles.dropdownHeader}>
                      <p className={styles.dUsername}>@{user?.username}</p>
                      <p className={styles.dEmail}>{user?.email}</p>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <Link href={`/dashboard/profile/${user?.username}`} className={styles.dropdownItem} onClick={() => setShowDropdown(false)} role="menuitem">
                      <span className={styles.dIcon} aria-hidden="true">👤</span> Mi Perfil
                    </Link>
                    <Link href="/dashboard/saved" className={styles.dropdownItem} onClick={() => setShowDropdown(false)} role="menuitem">
                      <span className={styles.dIcon} aria-hidden="true">🔖</span> Guardados
                    </Link>
                    <Link href="/dashboard/daily" className={styles.dropdownItem} onClick={() => setShowDropdown(false)} role="menuitem">
                      <span className={styles.dIcon} aria-hidden="true">🎁</span> Nexos Diarios
                    </Link>
                    {user?.role === 'ADMIN' && (
                      <Link href="/admin" className={`${styles.dropdownItem} ${styles.adminHighlight}`} onClick={() => setShowDropdown(false)} role="menuitem">
                        <span className={styles.dIcon} aria-hidden="true">🛡️</span> Panel Admin
                      </Link>
                    )}
                    <Link href="/dashboard/settings" className={styles.dropdownItem} onClick={() => setShowDropdown(false)} role="menuitem">
                      <span className={styles.dIcon} aria-hidden="true">⚙️</span> Ajustes
                    </Link>
                    <div className={styles.dropdownDivider} />
                    <button className={`${styles.dropdownItem} ${styles.logoutBtn}`} onClick={handleLogout} role="menuitem">
                      <span className={styles.dIcon} aria-hidden="true">🚪</span> Cerrar Sesión
                    </button>
                  </div>
                </ViewTransition>
              )}
            </div>

            {/* Hamburguesa para móviles */}
            <button 
              className={styles.hamburgerBtn} 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Abrir menú de navegación"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
            </button>
         </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className={styles.mobileDrawer}>
          <div className={styles.mobileLinks}>
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href} 
                className={`${styles.mobileNavLink} ${pathname === link.href ? styles.mobileNavLinkActive : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};
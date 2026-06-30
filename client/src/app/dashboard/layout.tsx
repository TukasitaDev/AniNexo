'use client';

import { ReactNode } from 'react';
import { SocketProvider } from '../../components/auth/SocketProvider';
import { TopNavbar } from '../../components/layout/TopNavbar';
// import { Sidebar } from '../../components/layout/Sidebar';
import { NexoFloatingOrb } from '../../components/nexo/NexoFloatingOrb';
import { NexoTour } from '../../components/ui/NexoTour/NexoTour';
import { MessengerChatButton } from '../../components/layout/MessengerChatButton';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SocketProvider>
      <div className={styles.dashboardLayout}>
        {/* <Sidebar /> */}
        <div className={styles.mainWrapper}>
          <TopNavbar />
          <main className={styles.mainContent}>
            <div className={styles.contentInner}>
              {children}
            </div>
          </main>
        </div>
        <NexoFloatingOrb />
        <MessengerChatButton />
        <NexoTour />
      </div>
    </SocketProvider>
  );
}


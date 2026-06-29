import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000'),
  title: {
    default: "AniNexo | La Dimensión Definitiva del Anime",
    template: "%s | AniNexo"
  },
  description: "Únete a AniNexo, la comunidad de anime más avanzada con IA personalizada, streaming, y rastreo de episodios en tiempo real.",
  keywords: ["anime", "aninexo", "comunidad anime", "nexo ai", "ver anime", "lista anime"],
  authors: [{ name: "AniNexo Team" }],
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://aninexo.com",
    siteName: "AniNexo",
    title: "AniNexo | La Dimensión Definitiva del Anime",
    description: "Comunidad de anime con IA avanzada y rastreo dinámico.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AniNexo Portal"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "AniNexo | Anime & AI",
    description: "La evolución de las comunidades de anime.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  }
};

import Scene3D from "@/components/background/Scene3D";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <Scene3D />
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}

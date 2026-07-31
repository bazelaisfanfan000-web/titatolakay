import type { Metadata } from "next";

import "./globals.css";

import OnlineTracker from "@/components/OnlineTracker";

import { LanguageProvider } from "@/context/LanguageContext";

import Script from "next/script";

import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";


export const metadata: Metadata = {

  title: "TI TA TO",

  description: "Jeu multijoueur TI TA TO",

  icons: {
    icon: "/titato-logo.svg",
    apple: "/titato-logo.svg",
  },

  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Titato",
  },

  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },

  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#2563eb",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#020617",
    },
  ],

};



export default function RootLayout({

  children,

}: Readonly<{

  children: React.ReactNode;

}>) {


return (

<html lang="fr">


<body>


<LanguageProvider>


<OnlineTracker />

<ServiceWorkerRegistration />



{/* Monetag Popunder */}

<Script

src="https://5gvci.com/act/files/tag.min.js?z=11339844"

strategy="afterInteractive"

/>



{children}


</LanguageProvider>


</body>


</html>

);

}
import type { Metadata } from "next";

import "./globals.css";

import OnlineTracker from "@/components/OnlineTracker";

import { LanguageProvider } from "@/context/LanguageContext";

import Script from "next/script";


export const metadata: Metadata = {

  title: "TI TA TO",

  description: "Jeu multijoueur TI TA TO",

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
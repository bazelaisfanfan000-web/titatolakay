import type { Metadata } from "next";

import "./globals.css";

import Script from "next/script";

import OnlineTracker from "@/components/OnlineTracker";

import { LanguageProvider } from "@/context/LanguageContext";



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


<head>


{/* Google AdSense */}

<Script

id="google-adsense"

async

strategy="afterInteractive"

src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5894815902617573"

crossOrigin="anonymous"

/>


<meta

name="google-adsense-account"

content="ca-pub-5894815902617573"

/>


</head>



<body>


<LanguageProvider>

<OnlineTracker />

{children}

</LanguageProvider>


</body>


</html>

);

}
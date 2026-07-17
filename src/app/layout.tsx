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


{/* Monetag Multitag */}

<Script

id="monetag-multitag"

src="https://quge5.com/88/tag.min.js"

data-zone="260585"

async

data-cfasync="false"

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
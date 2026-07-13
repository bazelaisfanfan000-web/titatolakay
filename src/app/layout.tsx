import type { Metadata } from "next";

import "./globals.css";

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

      <body>

        <LanguageProvider>

          <OnlineTracker />

          {children}

        </LanguageProvider>

      </body>

    </html>

  );

}
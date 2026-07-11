import type { Metadata } from "next";

import "./globals.css";

import Presence from "@/components/Presence";


export const metadata: Metadata = {

  title: "Ti Ta To",

  description: "Plateforme de jeu Ti Ta To"

};



export default function RootLayout({

  children,

}: Readonly<{

  children: React.ReactNode;

}>) {


  return (

    <html lang="fr">

      <body>

        <Presence />

        {children}

      </body>

    </html>

  );


}
import "./globals.css";

import {
  LanguageProvider
} from "@/context/LanguageContext";


export const metadata = {

  title: "DOMINOS HAITI",

  description: "Jeu de dominos en ligne avec portefeuille HTG"

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

          {children}

        </LanguageProvider>

      </body>

    </html>

  );


}
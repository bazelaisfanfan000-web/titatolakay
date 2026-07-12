"use client";


import {
  createContext,
  useContext,
  useState
} from "react";



const translations = {


fr: {

settings:"Paramètres",

profile:"Profil",

editProfile:"Modifier le profil",

security:"Sécurité",

changePassword:"Changer le mot de passe",

notificationsOn:"Activées",

notificationsOff:"Désactivées",

beta:"Version bêta",

conditions:"Conditions d'utilisation",

privacy:"Politique de confidentialité",

logout:"Déconnexion",

logoutQuestion:"Voulez-vous vraiment quitter ?"

},



ht: {

settings:"Paramèt",

profile:"Pwofil",

editProfile:"Modifye pwofil",

security:"Sekirite",

changePassword:"Chanje modpas",

notificationsOn:"Aktive",

notificationsOff:"Dezaktive",

beta:"Vèsyon beta",

conditions:"Kondisyon itilizasyon",

privacy:"Règleman vi prive",

logout:"Dekonekte",

logoutQuestion:"Èske ou vle soti vre ?"

}


};



type LanguageContextType={


language:"fr"|"ht";


setLanguage:(lang:"fr"|"ht")=>void;


t:any;


};



const LanguageContext =

createContext<LanguageContextType | null>(null);





export function LanguageProvider({

children

}:{

children:React.ReactNode

}){


const [language,setLanguage]=useState<"fr"|"ht">("fr");



return (


<LanguageContext.Provider


value={{

language,

setLanguage,

t:translations[language]

}}


>


{children}


</LanguageContext.Provider>


);


}






export function useLanguage(){


const context = useContext(LanguageContext);



if(!context){


throw new Error(
"useLanguage doit être utilisé dans LanguageProvider"
);


}



return context;


}
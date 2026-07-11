"use client";

import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

import { useRouter } from "next/navigation";

import {
  signOut
} from "firebase/auth";

import {
  auth
} from "@/lib/firebase";



export default function SettingsPage(){


const router = useRouter();





async function logout(){


try{


await signOut(auth);


router.push("/login");



}catch(error){


console.log(
"Erreur déconnexion :",
error
);


alert("Impossible de se déconnecter");


}


}








return (


<main className="
min-h-screen
bg-black
text-white
pt-16
pb-20
px-4
">


<Header />





<div className="
max-w-sm
mx-auto
pt-8
">





<h1 className="
text-xl
font-black
mb-5
">

⚙️ Paramètre

</h1>









{/* PROFIL */}

<div className="
bg-white/10
border
border-white/20
rounded-2xl
p-4
mb-3
">


<h2 className="
font-bold
">

👤 Profil joueur

</h2>



<p className="
text-xs
text-gray-400
mt-1
">

Modifier votre nom et vos informations

</p>


</div>









{/* SECURITE */}

<div className="
bg-white/10
border
border-white/20
rounded-2xl
p-4
mb-3
">


<h2 className="
font-bold
">

🔐 Sécurité

</h2>



<p className="
text-xs
text-gray-400
mt-1
">

Mot de passe et protection du compte

</p>


</div>









{/* LANGUE */}

<div className="
bg-white/10
border
border-white/20
rounded-2xl
p-4
mb-3
">


<h2 className="
font-bold
">

🌍 Langue

</h2>



<p className="
text-xs
text-gray-400
mt-1
">

Français 🇫🇷

</p>


</div>









{/* A PROPOS */}

<div className="
bg-white/10
border
border-white/20
rounded-2xl
p-4
mb-5
">


<h2 className="
font-bold
">

ℹ️ À propos

</h2>



<p className="
text-xs
text-gray-400
mt-1
">

Ti Ta To Arena

<br/>

Version bêta

</p>


</div>









{/* NOUVEAU COMPTE */}


<button

onClick={()=>router.push("/register")}

className="
w-full
bg-blue-600
py-3
rounded-xl
font-bold
mb-3
"

>

📝 Créer un nouveau compte

</button>









{/* DECONNEXION */}


<button

onClick={logout}

className="
w-full
bg-red-600
py-3
rounded-xl
font-bold
"

>

🚪 Déconnexion

</button>









</div>









<BottomNav />





</main>


);


}
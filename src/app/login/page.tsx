"use client";

import {
  useState
} from "react";

import {
  useRouter
} from "next/navigation";


import {
  auth
} from "../../lib/firebase";


import {
  signInWithEmailAndPassword
} from "firebase/auth";


import {
  motion
} from "framer-motion";


import {
  Mail,
  Lock
} from "lucide-react";





export default function Login(){


const router = useRouter();



const [email,setEmail] =
useState("");

const [password,setPassword] =
useState("");

const [error,setError] =
useState("");

const [loading,setLoading] =
useState(false);





async function login(){


if(!email || !password){


setError(
"Tous les champs sont obligatoires"
);


return;

}




try{


setLoading(true);

setError("");



await signInWithEmailAndPassword(

auth,

email,

password

);



router.push("/dashboard");



}

catch(err:any){



if(err.code==="auth/user-not-found"){


setError(
"Aucun compte trouvé"
);


}


else if(err.code==="auth/wrong-password"){


setError(
"Mot de passe incorrect"
);


}


else if(err.code==="auth/invalid-email"){


setError(
"Email invalide"
);


}


else{


setError(
"Erreur de connexion"
);


}


}


finally{


setLoading(false);


}



}





return(


<main

className="
relative
flex
min-h-screen
items-center
justify-center
overflow-hidden
bg-[#05070b]
px-3
text-white
"

>


{/* ========================================
    BACKGROUND
======================================== */}

<div

className="
pointer-events-none
absolute
left-1/2
top-[-180px]
h-[350px]
w-[350px]
-translate-x-1/2
rounded-full
bg-blue-600/10
blur-[120px]
"

/>



<div

className="
pointer-events-none
absolute
bottom-[-150px]
right-[-100px]
h-[280px]
w-[280px]
rounded-full
bg-blue-500/[0.06]
blur-[110px]
"

/>





{/* ========================================
    CONTENU
======================================== */}

<motion.section

initial={{
opacity:0,
y:15,
}}

animate={{
opacity:1,
y:0,
}}

className="
relative
z-10
w-full
max-w-[300px]
"

>



{/* ========================================
    GRANDE CARTE
======================================== */}

<div
  className="
    rounded-2xl
    border
    border-white/[0.08]
    bg-[#0a0d13]/95
    p-3
    shadow-[0_20px_60px_rgba(0,0,0,0.45)]
    backdrop-blur-2xl
  "
>



{/* TITRE */}

<p

className="
text-center
text-[8px]
font-black
uppercase
tracking-[0.18em]
text-blue-400
"

>

Connexion

</p>



<h1

className="
mt-1
text-center
text-lg
font-black
"

>

Connexion à ton compte joueur

</h1>



<p

className="
mt-1
text-center
text-[9px]
leading-4
text-white/30
"

>

Connecte-toi pour rejoindre Wincash et jouer avec tes amis.

</p>





{/* ========================================
    EMAIL
======================================== */}

<div

className="
relative
mt-3
"

>


<Mail

size={13}

className="
pointer-events-none
absolute
left-2.5
top-1/2
-translate-y-1/2
text-blue-400
"

/>



<input

className="
h-8
w-full
rounded-lg
border
border-white/[0.08]
bg-white/[0.025]
pl-8
pr-2
text-[9px]
text-white
outline-none
transition
placeholder:text-white/20
focus:border-blue-500/40
focus:bg-blue-500/[0.04]
"

placeholder="Email"

type="email"

value={email}

onChange={(e)=>setEmail(e.target.value)}

/>


</div>





{/* ========================================
    MOT DE PASSE
======================================== */}

<div

className="
relative
mt-2
"

>


<Lock

size={13}

className="
pointer-events-none
absolute
left-2.5
top-1/2
-translate-y-1/2
text-blue-400
"

/>



<input

className="
h-8
w-full
rounded-lg
border
border-white/[0.08]
bg-white/[0.025]
pl-8
pr-2
text-[9px]
text-white
outline-none
transition
placeholder:text-white/20
focus:border-blue-500/40
focus:bg-blue-500/[0.04]
"

placeholder="Mot de passe"

type="password"

value={password}

onChange={(e)=>setPassword(e.target.value)}

/>


</div>





{/* ========================================
    ERREUR
======================================== */}

{

error &&

<p

className="
mt-2
rounded-lg
border
border-red-500/10
bg-red-500/[0.06]
px-2
py-1.5
text-[8px]
text-red-400
"

>

{error}

</p>

}





{/* ========================================
    BOUTON CONNEXION
    3D BLEU TRANSPARENT
======================================== */}

<motion.button

type="button"

onClick={login}

disabled={loading}

whileTap={{
scale:0.97,
y:3,
}}

className="
mt-3
flex
h-9
w-full
items-center
justify-center
rounded-lg
border
border-blue-400/40
bg-blue-500/20
text-[9px]
font-black
text-blue-100
shadow-[0_3px_0_rgba(30,64,175,0.8),0_0_18px_rgba(37,99,235,0.12)]
backdrop-blur-md
transition-all
hover:border-blue-300/60
hover:bg-blue-500/30
hover:shadow-[0_4px_0_rgba(30,64,175,0.8),0_0_25px_rgba(37,99,235,0.2)]
active:translate-y-[3px]
active:shadow-none
disabled:cursor-not-allowed
disabled:opacity-50
"

>


{

loading

?

"Connexion..."

:

"🔐 Se connecter"

}


</motion.button>





{/* ========================================
    MESSAGE
======================================== */}

<p

className="
mt-3
text-center
text-[8px]
font-bold
text-blue-400/80
"

>

🎮 Joue avec tes amis en temps réel

</p>





{/* ========================================
    INSCRIPTION
======================================== */}

<div

className="
mt-3
text-center
"

>


<p

className="
text-[8px]
text-white/25
"

>

Pas encore de compte ?

</p>



<motion.button

type="button"

whileTap={{
scale:0.97,
y:3,
}}

onClick={()=>router.push("/register")}

className="
mt-2
flex
h-9
w-full
items-center
justify-center
rounded-lg
border
border-blue-400/25
bg-blue-500/[0.08]
text-[9px]
font-black
text-blue-100
shadow-[0_3px_0_rgba(30,64,175,0.65),0_0_15px_rgba(37,99,235,0.08)]
backdrop-blur-md
transition-all
hover:border-blue-300/50
hover:bg-blue-500/[0.15]
hover:shadow-[0_4px_0_rgba(30,64,175,0.7),0_0_22px_rgba(37,99,235,0.15)]
active:translate-y-[3px]
active:shadow-none
"

>

🚀 Créer un compte

</motion.button>


</div>


</div>





{/* ========================================
    VERSION
======================================== */}

<p

className="
mt-3
text-center
text-[7px]
text-white/15
"

>

TiTaTo • Version Beta

</p>


</motion.section>


</main>


);


}
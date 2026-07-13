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
min-h-screen
relative
overflow-hidden
bg-gradient-to-br
from-[#020617]
via-[#07152f]
to-black
text-white
flex
items-center
justify-center
px-3
"

><div

className="
absolute
w-40
h-40
bg-blue-500/20
rounded-full
blur-3xl
top-10
left-5
"

/>




<div

className="
absolute
w-40
h-40
bg-purple-500/20
rounded-full
blur-3xl
bottom-10
right-5
"

/>






<section

className="
relative
z-10
w-[280px]
text-center
"

>




<div

className="
bg-white/10
backdrop-blur-2xl
border
border-white/20
rounded-3xl
p-3
shadow-2xl
"

>






<motion.h1


animate={{

y:[0,-6,0],

rotate:[0,2,-2,0]

}}


transition={{

duration:3,

repeat:Infinity

}}



className="
text-xl
font-black
bg-gradient-to-r
from-blue-400
to-cyan-300
bg-clip-text
text-transparent
"

>

⭕ TI TA TO

</motion.h1>







<p

className="
text-[11px]
text-gray-300
mt-2
"

>

Connexion à ton compte joueur

</p>







<div

className="
relative
mt-4
"

>



<Mail

size={13}

className="
absolute
left-3
top-2.5
text-blue-400
"

/>




<input

className="
w-full
h-8
pl-9
rounded-xl
bg-black/30
border
border-white/20
text-[11px]
outline-none
placeholder:text-gray-500
"

placeholder="Email"

type="email"

value={email}

onChange={(e)=>setEmail(e.target.value)}

/>



</div>








<div

className="
relative
mt-3
"

>



<Lock

size={13}

className="
absolute
left-3
top-2.5
text-blue-400
"

/>




<input

className="
w-full
h-8
pl-9
rounded-xl
bg-black/30
border
border-white/20
text-[11px]
outline-none
placeholder:text-gray-500
"

placeholder="Mot de passe"

type="password"

value={password}

onChange={(e)=>setPassword(e.target.value)}

/>



</div>








{
error &&


<p

className="
text-red-400
text-[10px]
mt-3
"

>

{error}

</p>


}<button


onClick={login}

disabled={loading}



className="
w-full
h-8
mt-3
rounded-xl
text-[11px]
font-bold
bg-gradient-to-b
from-blue-400
to-blue-700
shadow-[0_5px_0_#123a8a]
hover:scale-105
active:scale-95
transition
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


</button>







<p

className="
text-[10px]
text-cyan-300
mt-3
"

>

🎮 Joue avec tes amis en temps réel

</p>








<p

className="
text-[10px]
text-gray-400
mt-4
"

>

Pas encore de compte ?

</p>







<button


onClick={()=>router.push("/register")}



className="
mt-2
text-[11px]
font-bold
text-cyan-300
hover:text-cyan-200
transition
"

>

🚀 Créer un compte

</button>









</div>


</section>






</main>


);


}
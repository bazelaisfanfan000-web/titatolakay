"use client";

import {
  useState
} from "react";

import {
  useRouter
} from "next/navigation";


import {
  auth,
  database
} from "../../lib/firebase";


import {
  createUserWithEmailAndPassword
} from "firebase/auth";


import {
  ref,
  set,
  push
} from "firebase/database";


import {
  motion
} from "framer-motion";


import {
  User,
  Mail,
  Lock
} from "lucide-react";






export default function Register(){


const router = useRouter();




const [username,setUsername] =
useState("");

const [email,setEmail] =
useState("");

const [password,setPassword] =
useState("");



const [error,setError] =
useState("");

const [loading,setLoading] =
useState(false);








async function register(){



if(!username || !email || !password){


setError(
"Tous les champs sont obligatoires"
);


return;


}





if(password.length < 6){


setError(
"Le mot de passe doit avoir au moins 6 caractères"
);


return;


}





try{


setLoading(true);

setError("");





const result =
await createUserWithEmailAndPassword(

auth,

email,

password

);



const user =
result.user;



const uid =
user.uid;






await set(

ref(database,`users/${uid}`),

{


uid,

username,

email,

balance:1000,

currency:"HTG",

createdAt:Date.now(),

lastBonus:Date.now()


}

);







const notificationRef =
push(

ref(database,`notifications/${uid}`)

);







await set(

notificationRef,

{


title:"🎁 Bonus de bienvenue",

message:
"Tu as reçu +1000 HTG pour commencer à jouer sur Ti Ta To.",


amount:1000,


type:"bonus",


read:false,


createdAt:Date.now()


}

);







router.push("/dashboard");



}

catch(err:any){



if(err.code==="auth/email-already-in-use"){


setError(
"Cet email existe déjà"
);


}


else if(err.code==="auth/invalid-email"){


setError(
"Email invalide"
);


}


else{


setError(
err.message
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

>





<div

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
w-[240px]
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
p-4
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

Créer ton compte joueur

</p><div

className="
relative
mt-5
"

>


<User

size={14}

className="
absolute
left-3
top-3
text-blue-400
"

/>



<input

className="
w-full
h-9
pl-9
rounded-xl
bg-black/30
border
border-white/20
text-[11px]
outline-none
placeholder:text-gray-500
"

placeholder="Nom joueur"

value={username}

onChange={(e)=>setUsername(e.target.value)}

/>


</div>







<div

className="
relative
mt-3
"

>


<Mail

size={14}

className="
absolute
left-3
top-3
text-blue-400
"

/>



<input

className="
w-full
h-9
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

size={14}

className="
absolute
left-3
top-3
text-blue-400
"

/>



<input

className="
w-full
h-9
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


}









<button


onClick={register}

disabled={loading}



className="
w-full
h-9
mt-4
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

"Création..."

:

"🚀 Créer mon compte"

}


</button>









<p

className="
text-[10px]
text-yellow-300
mt-4
"

>

🎁 Nouveau joueur : +1000 HTG offert

</p>









<p

className="
text-[10px]
text-gray-400
mt-5
"

>

Déjà enregistré ?

</p>







<button


onClick={()=>router.push("/login")}



className="
mt-2
text-[11px]
font-bold
text-cyan-300
hover:text-cyan-200
transition
"

>

🔐 Connexion

</button>









</div>


</section>






</main>


);


}
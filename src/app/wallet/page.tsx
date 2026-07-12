"use client";

import {
  useEffect,
  useState
} from "react";

import {
  useRouter
} from "next/navigation";

import {
  auth,
  database
} from "@/lib/firebase";

import {
  onAuthStateChanged
} from "firebase/auth";

import {
  ref,
  onValue
} from "firebase/database";

import {
  useBalance
} from "@/hooks/useBalance";

import {
  motion
} from "framer-motion";



export default function WalletPage(){


const router = useRouter();



const {
 balance,
 loading:balanceLoading
}=useBalance();



const [
 username,
 setUsername
]=useState("Joueur");



const [
 loading,
 setLoading
]=useState(true);



const [
 message,
 setMessage
]=useState("");





useEffect(()=>{


const unsubscribeAuth =

onAuthStateChanged(

auth,

(user)=>{


if(!user){

router.push("/login");

return;

}



const userRef =

ref(

database,

`users/${user.uid}`

);





const unsubscribeData =

onValue(

userRef,

(snapshot)=>{


const data=snapshot.val();



if(data){

setUsername(
data.username || "Joueur"
);

}


setLoading(false);


}

);



return()=>unsubscribeData();


}

);



return()=>unsubscribeAuth();



},[router]);







if(loading || balanceLoading){


return(

<main className="
min-h-screen
bg-black
text-white
flex
items-center
justify-center
">

Chargement portefeuille...

</main>

);


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
px-4
pb-20
"

>


<motion.div

animate={{
x:[0,30,0],
y:[0,20,0]
}}

transition={{
duration:6,
repeat:Infinity
}}

className="
absolute
w-52
h-52
bg-blue-500/20
rounded-full
blur-3xl
top-10
left-[-40px]
"

/>





<motion.div

animate={{
x:[0,-30,0],
y:[0,-20,0]
}}

transition={{
duration:7,
repeat:Infinity
}}

className="
absolute
w-52
h-52
bg-purple-500/20
rounded-full
blur-3xl
bottom-20
right-[-40px]
"/>





<div

className="
relative
z-10
max-w-xs
mx-auto
pt-10
"

>





<header

className="
flex
items-center
justify-between
mb-8
"

>


<button

onClick={()=>router.back()}

className="
text-gray-300
text-sm
"

>

← Retour

</button>




<motion.h1

animate={{
y:[0,-4,0]
}}

transition={{
duration:3,
repeat:Infinity
}}

className="
font-black
text-lg
bg-gradient-to-r
from-blue-400
to-cyan-300
bg-clip-text
text-transparent
"

>

💼 Portefeuille

</motion.h1>


<div></div>


</header>






<motion.section

initial={{
opacity:0,
scale:.9
}}

animate={{
opacity:1,
scale:1
}}

transition={{
duration:.5
}}

className="
bg-white/10
backdrop-blur-2xl
border
border-white/20
rounded-3xl
p-6
shadow-xl
text-center
"

>


<p className="
text-sm
text-gray-300
font-medium
">

💰 Solde disponible

</p>





<h2

className="
text-4xl
font-black
mt-4
text-green-400
"

>

{Math.floor(balance)} HTG

</h2>





<p className="
text-xs
text-gray-400
mt-4
">

Compte : {username}

</p>


</motion.section>
<section

className="
mt-5
bg-white/10
backdrop-blur-xl
border
border-white/20
rounded-3xl
p-5
"

>


<h2 className="
font-bold
text-sm
mb-4
">

💳 Actions

</h2>






<WalletButton

color="blue"

onClick={()=>setMessage(
"⭕ Ti Ta To est en version bêta 🧪\n\nLes dépôts ne sont pas disponibles en mode test."
)}

>

➕ Déposer

</WalletButton>







<WalletButton

color="glass"

onClick={()=>setMessage(
"⭕ Ti Ta To est en version bêta 🧪\n\nLes retraits ne sont pas disponibles en mode test."
)}

>

💸 Retirer

</WalletButton>





</section>









{
message && (

<motion.div

initial={{
opacity:0,
y:50
}}

animate={{
opacity:1,
y:0
}}

className="
fixed
bottom-24
left-1/2
-translate-x-1/2
w-[90%]
max-w-xs
bg-[#07152f]
border
border-white/20
backdrop-blur-2xl
rounded-3xl
p-5
text-center
z-[100]
shadow-2xl
"

>


<p className="
text-sm
text-white
whitespace-pre-line
">

{message}

</p>





<button

onClick={()=>setMessage("")}

className="
mt-4
text-blue-400
text-xs
font-bold
"

>

Fermer

</button>



</motion.div>

)

}








<section

className="
mt-5
bg-white/10
backdrop-blur-xl
border
border-white/20
rounded-3xl
p-5
"

>


<h2 className="
font-bold
text-sm
">

📌 Information

</h2>




<p className="
text-xs
text-gray-400
mt-3
">

🧪 Ti Ta To est actuellement en version bêta.  
Les paiements réels sont désactivés.

</p>



</section>






</div>


</main>


);


}









function WalletButton({

children,

onClick,

color="blue"

}:{

children:React.ReactNode;

onClick:()=>void;

color?:"blue"|"glass";

}){


return(


<motion.button


whileHover={{

scale:1.03,

y:-3

}}



whileTap={{

scale:.95,

y:2

}}



onClick={onClick}



className={

color==="blue"

?

`
w-full
py-3
rounded-xl
mb-3
font-bold
text-sm

bg-gradient-to-b
from-blue-400
to-blue-700

border
border-blue-300/40

shadow-[0_5px_0_#123a8a]
`

:

`

w-full
py-3
rounded-xl
mb-3
font-bold
text-sm

bg-white/20

backdrop-blur-xl

border
border-white/30

shadow-[0_5px_0_rgba(255,255,255,0.15)]

`

}


>


{children}


</motion.button>


);

}
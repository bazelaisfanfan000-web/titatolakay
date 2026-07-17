"use client";

import {
  useRouter
} from "next/navigation";

import Image from "next/image";

import {
  motion
} from "framer-motion";

import {
  Trophy,
  Zap,
  Gamepad2
} from "lucide-react";

import {
  useState,
  useEffect
} from "react";


export default function Home(){


const router = useRouter();

const [countdown, setCountdown] = useState(10);


useEffect(() => {

  if (countdown > 0) {

    const timer = setTimeout(
      () => setCountdown(countdown - 1),
      1000
    );

    return () => clearTimeout(timer);

  }

}, [countdown]);



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




<motion.section

initial={{
opacity:0,
scale:.85
}}

animate={{
opacity:1,
scale:1
}}

transition={{
duration:.6
}}

className="
relative
z-10
w-[240px]
text-center
"

>



{/* LOGO */}

<motion.div

animate={{
y:[0,-5,0]
}}

transition={{
duration:3,
repeat:Infinity
}}

className="
mb-5
"

>


<div

className="
mx-auto
w-24
h-24
rounded-2xl
bg-white/10
backdrop-blur-xl
border
border-white/20
shadow-xl
flex
items-center
justify-center
overflow-hidden
"

>


<Image

src="/titato-logo.svg"

alt="TiTaTo Logo"

width={90}

height={90}

priority

/>


</div>




<h1

className="
mt-3
text-xl
font-black
tracking-widest
bg-gradient-to-r
from-blue-400
to-cyan-300
bg-clip-text
text-transparent
"

>

TI TA TO

</h1>



<p

className="
text-[10px]
text-gray-400
mt-1
"

>

Joue des parties et gagne de l'argent 💰

</p>


</motion.div>





<motion.div

initial={{
opacity:0,
y:20
}}

animate={{
opacity:1,
y:0
}}

transition={{
delay:.2
}}

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


<h2

className="
text-base
font-bold
mb-2
"

>

Bienvenue 👋

</h2>



<p

className="
text-[11px]
text-gray-300
mb-4
"

>

Crée ton compte et rejoins la communauté.

</p>



<motion.button

whileHover={{
scale:1.05,
y:-3
}}

whileTap={{
scale:.95,
y:2
}}

onClick={()=>router.push("/register")}

className="
w-full
h-9
rounded-xl
text-[11px]
font-bold
bg-gradient-to-b
from-blue-400
to-blue-700
border
border-blue-300/40
shadow-[0_5px_0_#123a8a]
mb-3
"

>

🚀 Créer un compte

</motion.button>




<motion.button

whileHover={{
scale:1.05,
y:-3
}}

whileTap={{
scale:.95,
y:2
}}

onClick={()=>router.push("/login")}

className="
w-full
h-9
rounded-xl
text-[11px]
font-bold
bg-gradient-to-b
from-white/30
to-white/10
border
border-white/20
shadow-[0_5px_0_rgba(255,255,255,0.15)]
"

>

🔐 Connexion

</motion.button>



</motion.div>





<div

className="
grid
grid-cols-3
gap-2
mt-4
"

>


<Card icon={<Zap size={14}/>} text="Rapide"/>

<Card icon={<Trophy size={14}/>} text="Défis"/>

<Card icon={<Gamepad2 size={14}/>} text="Jeu"/>


</div>




<motion.div

animate={{
opacity:[0.5,1,0.5]
}}

transition={{
duration:3,
repeat:Infinity
}}

className="
mt-5
text-[10px]
text-cyan-300
font-bold
"

>

<p>
🎮 Joue avec tes amis en temps réel + gagne 💰
</p>

<p className="mt-1 text-gray-400">
💬 Chatter pendant la partie
</p>

</motion.div>



<p

className="
text-[9px]
text-gray-500
mt-3
"

>

🧪 version Beta

</p>




<motion.p

animate={{
opacity:[0.5,1,0.5]
}}

transition={{
duration:3,
repeat:Infinity
}}

className="
text-[9px]
text-yellow-300
mt-8
font-bold
"

>

{
countdown > 0
?
"Prochaine mise à jour dans " + countdown + "s"
:
"Mise à jour disponible !"
}

</motion.p>



</motion.section>



</main>


);

}




function Card({

icon,

text

}:{

icon:any;

text:string;

}){


return(

<motion.div

whileHover={{
scale:1.08,
y:-4
}}

className="
bg-white/10
backdrop-blur-xl
border
border-white/20
rounded-xl
p-2
flex
flex-col
items-center
"

>


<div className="text-blue-400">

{icon}

</div>


<p

className="
text-[9px]
text-gray-300
"

>

{text}

</p>


</motion.div>

);

}
"use client";

import {
  useRouter
} from "next/navigation";


export default function Home(){


const router = useRouter();



return (

<main

className="
min-h-screen
bg-[#050505]
text-white
flex
items-center
justify-center
px-4
"

>


<section

className="
w-full
max-w-xs
text-center
"

>



{/* LOGO */}

<div

className="
mb-8
animate-pulse
"

>

<h1

className="
flex
justify-center
items-center
gap-1
font-black
"

>

<span className="text-lg">
⭕
</span>


<span

className="
text-lg
text-blue-500
"

>
X
</span>



<span

className="
text-sm
text-blue-400
"

>
TI TA TO
</span>


</h1>


<p

className="
text-[10px]
text-gray-400
mt-2
"

>

Le jeu rapide entre amis 🎮

</p>


</div>





{/* CARTE */}

<div

className="
bg-white/5
border
border-white/10
rounded-2xl
p-5
backdrop-blur-xl
"

>



<h2

className="
text-sm
font-bold
mb-3
"

>

Bienvenue 👋

</h2>



<p

className="
text-[11px]
text-gray-400
leading-5
mb-5
"

>

Crée ton compte et joue à Ti Ta To
avec des joueurs du monde entier.

</p>





<button

onClick={()=>router.push("/register")}

className="
w-full
py-3
rounded-xl
bg-blue-600
text-xs
font-bold
mb-3
animate-pulse
shadow-lg
shadow-blue-600/30
"

>

🚀 Créer un compte

</button>





<button

onClick={()=>router.push("/login")}

className="
w-full
py-3
rounded-xl
bg-white/10
border
border-white/10
text-xs
font-bold
"

>

🔐 Connexion

</button>



</div>






{/* FEATURES */}

<div

className="
grid
grid-cols-3
gap-2
mt-5
"

>


<div

className="
bg-white/5
rounded-xl
p-3
"

>

<p className="text-sm">

⚡

</p>

<p className="text-[9px] text-gray-400">

Rapide

</p>

</div>





<div

className="
bg-white/5
rounded-xl
p-3
"

>

<p className="text-sm">

🏆

</p>

<p className="text-[9px] text-gray-400">

Classement

</p>

</div>





<div

className="
bg-white/5
rounded-xl
p-3
"

>

<p className="text-sm">

🎮

</p>

<p className="text-[9px] text-gray-400">

Jeu

</p>

</div>



</div>






<p

className="
text-[9px]
text-gray-600
mt-8
"

>

🧪 Version bêta

</p>



</section>


</main>


);

}
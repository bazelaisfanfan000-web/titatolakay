"use client";

import { useRouter } from "next/navigation";


export default function Home(){

const router = useRouter();


return (

<main
className="
min-h-screen
bg-gradient-to-b
from-[#020617]
via-[#07142f]
to-black
text-white
flex
items-center
justify-center
px-6
"
>


<div
className="
w-full
max-w-sm
bg-white/5
backdrop-blur-xl
border
border-white/10
rounded-3xl
p-8
shadow-2xl
text-center
"
>



<div
className="
text-6xl
mb-5
animate-pulse
"
>
⭕
</div>



<h1
className="
text-4xl
font-black
tracking-wide
text-blue-400
"
>
TI TA TO
</h1>



<p
className="
mt-3
text-gray-400
text-sm
"
>
Le jeu de stratégie rapide entre amis 🎮
</p>





<div
className="
mt-10
space-y-4
"
>


<button

onClick={()=>router.push("/register")}

className="
w-full
py-4
rounded-2xl
bg-gradient-to-r
from-blue-600
to-cyan-500
font-black
text-lg
shadow-lg
shadow-blue-500/30
active:scale-95
transition
"

>

🚀 Créer un compte

</button>




<button

onClick={()=>router.push("/login")}

className="
w-full
py-4
rounded-2xl
bg-white/10
border
border-white/20
font-bold
text-lg
hover:bg-white/20
active:scale-95
transition
"

>

🔐 Connexion

</button>


</div>





<div
className="
mt-8
flex
justify-center
gap-3
text-xs
text-gray-500
"
>

<span>🧪 Version bêta</span>

<span>•</span>

<span>🎮 Jeu en ligne</span>

</div>



</div>


</main>

);

}
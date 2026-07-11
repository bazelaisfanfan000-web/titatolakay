"use client";

import {
  useRouter
} from "next/navigation";

import {
  useEffect,
  useState
} from "react";


export default function Home(){


const router = useRouter();



const [board,setBoard] = useState([
"X","","O",
"","X","",
"O","","X"
]);



useEffect(()=>{


const timer = setInterval(()=>{


setBoard([
"",
"X",
"O",
"O",
"",
"X",
"X",
"O",
""
]);



setTimeout(()=>{


setBoard([
"X",
"",
"O",
"",
"X",
"",
"O",
"",
"X"
]);


},1200);



},2500);



return ()=>clearInterval(timer);


},[]);






return (

<main

className="
relative
min-h-screen
overflow-hidden
bg-black
text-white
flex
items-center
justify-center
px-5
"

>



{/* Lumières de fond */}

<div

className="
absolute
top-10
left-1/2
-translate-x-1/2
w-96
h-96
bg-blue-600/30
rounded-full
blur-3xl
animate-pulse
"

></div>



<div

className="
absolute
bottom-0
right-0
w-80
h-80
bg-green-500/20
rounded-full
blur-3xl
"

></div>






<section

className="
relative
w-full
max-w-sm
rounded-[40px]
p-8
bg-white/10
border
border-white/20
backdrop-blur-2xl
shadow-[0_0_80px_rgba(0,120,255,0.35)]
animate-[fadeIn_1s_ease]
"

>






{/* LOGO X + O */}

<div

className="
relative
w-32
h-32
mx-auto
flex
items-center
justify-center
"

>


<span

className="
absolute
text-9xl
font-black
text-blue-500/40
animate-pulse
"

>

X

</span>



<span

className="
relative
text-7xl
animate-bounce
drop-shadow-[0_0_30px_rgba(0,200,255,0.9)]
"

>

⭕


</span>



</div>







<h1

className="
mt-3
text-center
text-5xl
font-black
bg-gradient-to-r
from-blue-400
via-cyan-300
to-green-400
bg-clip-text
text-transparent
"

>

TI TA TO

</h1>






<p

className="
text-center
mt-3
text-gray-300
text-sm
"

>

🔥 Le duel stratégique nouvelle génération

</p>








{/* Plateau */}

<div

className="
mt-8
grid
grid-cols-3
gap-3
p-4
rounded-3xl
bg-black/50
border
border-white/10
"

>


{

board.map((cell,index)=>(


<div

key={index}

className="
aspect-square
rounded-2xl
bg-white/10
flex
items-center
justify-center
text-4xl
font-black
transition-all
duration-700
hover:scale-110
"

>


<span

className={

cell==="X"

?

"text-blue-400 drop-shadow-[0_0_15px_#00aaff]"

:

"text-green-400 drop-shadow-[0_0_15px_lime]"

}

>

{cell}

</span>



</div>


))

}


</div>








{/* Boutons */}



<button

onClick={()=>router.push("/register")}

className="
mt-8
w-full
py-4
rounded-2xl
font-black
text-lg
bg-gradient-to-r
from-blue-600
to-cyan-400
shadow-[0_0_35px_rgba(0,180,255,0.8)]
animate-pulse
hover:scale-105
transition
"

>

🚀 CRÉER UN COMPTE

</button>






<button

onClick={()=>router.push("/login")}

className="
mt-4
w-full
py-4
rounded-2xl
font-bold
text-lg
bg-white/10
border
border-white/20
hover:bg-white/20
hover:scale-105
transition
"

>

🔐 CONNEXION

</button>








<div

className="
mt-7
flex
justify-center
gap-2
text-xs
text-gray-400
"

>

<span>🧪 Bêta</span>

<span>•</span>

<span>🏆 Compétition</span>

<span>•</span>

<span>🎮 Online</span>


</div>






</section>







<style jsx>{`

@keyframes fadeIn {

from {

opacity:0;

transform:translateY(40px);

}


to {

opacity:1;

transform:translateY(0);

}

}


`}</style>




</main>

);


}
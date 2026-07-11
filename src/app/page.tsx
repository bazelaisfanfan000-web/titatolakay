"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";


export default function Home(){

const router = useRouter();


const [board,setBoard] = useState([
"X","","O",
"","X","",
"O","","X"
]);



useEffect(()=>{


const animation=setInterval(()=>{


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



return()=>clearInterval(animation);


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


{/* lumières animées */}

<div
className="
absolute
w-96
h-96
bg-blue-600/30
rounded-full
blur-3xl
animate-pulse
"
/>


<div
className="
absolute
bottom-0
w-80
h-80
bg-cyan-400/20
rounded-full
blur-3xl
"
/>





<section

className="
relative
w-full
max-w-sm
rounded-[35px]
p-8
bg-white/10
border
border-white/20
backdrop-blur-2xl
shadow-[0_0_80px_rgba(0,120,255,0.35)]
animate-[fadeIn_1s_ease]
"

>




<div
className="
text-7xl
animate-bounce
"
>
⭕
</div>



<h1

className="
mt-3
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
mt-3
text-gray-300
text-sm
"

>

🔥 Le duel stratégique nouvelle génération

</p>





{/* plateau animé */}

<div

className="
mt-8
grid
grid-cols-3
gap-3
p-4
rounded-3xl
bg-black/40
border
border-white/10
"

>

{

board.map((cell,i)=>(


<div

key={i}

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
duration-500
scale-100
hover:scale-110
"

>

<span

className={
cell==="X"
?
"text-blue-400 drop-shadow-[0_0_15px_blue]"
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
shadow-[0_0_30px_rgba(0,150,255,0.8)]
animate-pulse
hover:scale-105
transition
"

>

🚀 COMMENCER À JOUER

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

🔐 J'ai déjà un compte

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

from{
opacity:0;
transform:translateY(40px);
}

to{
opacity:1;
transform:translateY(0);
}

}

`}</style>


</main>

);

}
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


const [moves,setMoves] = useState([
  "X","","O",
  "","X","",
  "O","","X"
]);



useEffect(()=>{


const timer = setInterval(()=>{


setMoves([
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


setMoves([
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


},1500);



},3000);



return()=>clearInterval(timer);


},[]);





return (

<main

className="
min-h-screen
bg-gradient-to-br
from-[#020617]
via-[#071a3d]
to-black
text-white
flex
items-center
justify-center
px-5
overflow-hidden
"

>


<div

className="
absolute
w-72
h-72
bg-blue-600/20
rounded-full
blur-3xl
top-20
"

></div>




<div

className="
relative
w-full
max-w-sm
bg-white/5
border
border-white/10
backdrop-blur-xl
rounded-[32px]
p-7
shadow-2xl
text-center
"

>



<div

className="
text-6xl
animate-pulse
"

>
⭕
</div>



<h1

className="
text-5xl
font-black
mt-3
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
text-gray-300
mt-3
text-sm
"

>

Le duel stratégique où chaque coup compte 🎮

</p>





<div

className="
mt-8
grid
grid-cols-3
gap-2
bg-black/40
p-4
rounded-3xl
border
border-white/10
"

>


{
moves.map((item,index)=>(


<div

key={index}

className="
aspect-square
rounded-xl
bg-white/5
flex
items-center
justify-center
text-3xl
font-black
"

>


<span

className={
item==="X"
?
"text-blue-400"
:
"text-green-400"
}

>

{item}

</span>


</div>


))
}



</div>







<div

className="
mt-8
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
shadow-xl
shadow-blue-500/40
hover:scale-105
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
transition
"

>

🔐 Connexion

</button>



</div>






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

<span>
🧪 Version bêta
</span>

<span>
•
</span>

<span>
🏆 Mode compétition
</span>


</div>




</div>



</main>

);


}
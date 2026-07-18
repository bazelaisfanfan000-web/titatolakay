"use client";


import {
  useEffect,
  useState
} from "react";


import {
  ref,
  onValue
} from "firebase/database";


import {
  database
} from "@/lib/firebase";


import {
  motion
} from "framer-motion";


import BackButton from "@/components/BackButton";





export default function ChampionsPage(){


const [champions,setChampions] =
useState<any[]>([]);


const [loading,setLoading] =
useState(true);





useEffect(()=>{


const championsRef =
ref(
database,
"champions"
);




const unsubscribe =

onValue(

championsRef,

(snapshot)=>{


const data =
snapshot.val() || {};



const list =

Object.entries(data)

.map(([month,item]:any)=>(

{

month,

username:
item.username || "Joueur",


points:
item.points || 0,


reward:
item.reward || 1000

}

));





list.sort(
(a,b)=>
b.month.localeCompare(a.month)
);





setChampions(list);


setLoading(false);



}


);




return ()=>unsubscribe();



},[]);








return(


<main

className="

min-h-screen

bg-gradient-to-br

from-[#020617]

via-[#07152f]

to-black

text-white

px-4

py-10

"

>



<div

className="

max-w-sm

mx-auto

"

>



<BackButton />







<motion.h1

animate={{
y:[0,-5,0]
}}

transition={{
duration:3,
repeat:Infinity
}}

className="

text-xl

font-black

text-center

mb-6

bg-gradient-to-r

from-yellow-400

to-orange-300

bg-clip-text

text-transparent

"

>

🏆 Champions Ti Ta To

</motion.h1>









{

loading &&

<p

className="

text-center

text-gray-400

"

>

Chargement...

</p>

}










<div

className="

flex

flex-col

gap-4

"

>


{

champions.map(

(champion,index)=>(



<motion.div


key={champion.month}



initial={{
opacity:0,
y:20
}}


animate={{
opacity:1,
y:0
}}



className="

bg-white/10

backdrop-blur-xl

border

border-white/20

rounded-3xl

p-5

"

>



<div

className="

flex

justify-between

items-center

"

>



<div>


<h2

className="

font-bold

text-lg

"

>

🥇 {champion.username}

</h2>



<p

className="

text-xs

text-gray-400

"

>

📅 {champion.month}

</p>


</div>







<div

className="

text-right

"

>


<p

className="

text-yellow-400

font-black

"

>

⭐ {champion.points}

</p>



<p

className="

text-xs

text-gray-400

"

>

points

</p>


</div>



</div>








<div

className="

mt-4

bg-yellow-500/10

rounded-2xl

p-3

text-center

"

>


🎁 Récompense :

<span

className="

font-black

text-yellow-300

"

>

 {champion.reward} HTG

</span>


<br/>

<span

className="

text-xs

text-gray-400

"

>

Payé par MonCash

</span>


</div>







</motion.div>



)

)



}



</div>





</div>


</main>


);


}
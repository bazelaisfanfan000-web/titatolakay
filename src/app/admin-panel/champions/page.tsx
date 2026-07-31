"use client";


import {
  useEffect,
  useState
} from "react";


import {
  ref,
  onValue,
  update
} from "firebase/database";


import {
  database
} from "@/lib/firebase";


import {
  motion
} from "framer-motion";


import {
  Trophy,
  CheckCircle,
  Clock
} from "lucide-react";





export default function AdminChampionsPage(){


const [champions,setChampions] =
useState<any[]>([]);





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

.map(
([month,champion]:any)=>({


month,


...champion


})

)

.sort(
(a,b)=>

b.createdAt -

a.createdAt

);



setChampions(list);


}

);



return ()=>unsubscribe();



},[]);







async function markPaid(
month:string
){



await update(

ref(
database,
`champions/${month}`
),

{

paid:true,

paidAt:
Date.now()

}

);



}










return(


<div>


<h1

className="

text-2xl

font-black

mb-2

"

>

🏆 Champions Ti Ta To

</h1>



<p

className="

text-gray-400

text-sm

mb-6

"

>

Historique des gagnants mensuels

</p>








<div

className="

grid

gap-5

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

border

border-white/20

rounded-3xl

p-5

backdrop-blur-xl

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

font-black

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

Mois : {champion.month}

</p>



</div>





<Trophy

className="text-yellow-400"

/>



</div>









<div

className="

mt-5

grid

grid-cols-2

gap-3

"

>


<div

className="

bg-black/20

rounded-2xl

p-3

"

>


<p className="text-xs text-gray-400">
Points
</p>


<p className="font-black">
{champion.points || 0}
</p>


</div>






<div

className="

bg-black/20

rounded-2xl

p-3

"

>


<p className="text-xs text-gray-400">
Récompense
</p>


<p className="font-black text-yellow-300">
1000 HTG
</p>


</div>


</div>









<div

className="

mt-5

"

>



{

champion.paid

?

<div

className="

flex

items-center

gap-2

text-green-300

font-bold

"

>

<CheckCircle size={20}/>

Payé

</div>


:

<button


onClick={()=>markPaid(champion.month)}



className="

w-full

bg-yellow-500/20

border

border-yellow-400/30

rounded-2xl

py-3

font-bold

text-yellow-300

"

>

<Clock size={18} className="inline mr-2"/>

Marquer payé

</button>


}



</div>







</motion.div>


)

)



}



</div>







</div>


);


}
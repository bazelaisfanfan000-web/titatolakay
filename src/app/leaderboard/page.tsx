"use client";


import {
  useEffect,
  useState
} from "react";


import {
  useRouter
} from "next/navigation";


import {
  ref,
  onValue
} from "firebase/database";


import {
  database
} from "@/lib/firebase";





export default function LeaderboardPage(){


const router = useRouter();


const [players,setPlayers] =
useState<any[]>([]);


const [loading,setLoading] =
useState(true);






useEffect(()=>{



const usersRef =
ref(
database,
"users"
);





const unsubscribe =

onValue(

usersRef,

(snapshot)=>{


const data =
snapshot.val() || {};





const list =

Object.entries(data)

.map(([uid,user]:any)=>({

uid,

...user

}))

.filter(

(player:any)=>

player.wins !== undefined

);







// Trier par victoires

const sorted =

list.sort(

(a:any,b:any)=>

Number(b.wins || 0)

-

Number(a.wins || 0)

);







setPlayers(
sorted.slice(0,50)
);



setLoading(false);



}

);






return()=>unsubscribe();



},[]);








return(


<main

className="
min-h-screen
bg-[#050505]
text-white
px-4
py-8
"

>



<div

className="
max-w-md
mx-auto
"

>






<button

onClick={()=>router.back()}

className="
mb-6
bg-white/10
border
border-white/10
px-4
py-2
rounded-xl
text-sm
"

>

⬅️ Retour

</button>







<h1

className="
text-3xl
font-black
text-center
"

>

🏆 Classement Ti Ta To

</h1>





<p

className="
text-center
text-gray-400
text-sm
mt-2
"

>

Les meilleurs joueurs par victoires

</p>








{

loading &&


<p

className="
text-center
mt-10
text-gray-400
"

>

Chargement...

</p>


}








<div

className="
mt-8
space-y-4
"

>


{

players.map(

(player,index)=>(



<div

key={player.uid}

className="
bg-white/5
border
border-white/10
rounded-2xl
p-5
flex
items-center
justify-between
"

>



<div

className="
flex
items-center
gap-3
"

>


<div

className="
text-xl
font-black
"

>


{

index === 0 ?

"🥇"

:

index === 1 ?

"🥈"

:

index === 2 ?

"🥉"

:

`#${index+1}`


}


</div>







<div>


<h2

className="
font-bold
"

>

{player.username || "Joueur"}

</h2>



<p

className="
text-xs
text-gray-400
"

>

🎮 {player.games || 0} parties

</p>


</div>



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

🏆 {player.wins || 0}

</p>


<p

className="
text-xs
text-gray-400
"

>

victoires

</p>



</div>






</div>



)


)


}



</div>







</div>



</main>


);


}
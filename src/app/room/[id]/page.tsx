"use client";


import {
  useEffect,
  useState,
  useRef
} from "react";


import {
  useParams,
  useRouter
} from "next/navigation";


import {
  motion
} from "framer-motion";


import {
  ref,
  onValue,
  update
} from "firebase/database";


import {
  database,
  auth
} from "@/lib/firebase";


import BackButton from "@/components/BackButton";





export default function RoomPage(){


const params =
useParams();


const router =
useRouter();



const id =
params.id as string;



const [room,setRoom] =
useState<any>(null);



const [players,setPlayers] =
useState<any[]>([]);



const [leaving,setLeaving] =
useState(false);



const startingRef =
useRef(false);









useEffect(()=>{


if(!id)
return;



const roomRef =
ref(
database,
`rooms/${id}`
);





const unsubscribe =
onValue(
roomRef,
(snapshot)=>{


const data =
snapshot.val();



if(!data)
return;



setRoom(data);



const list =
data.players
?
Object.values(data.players)
:
[];



setPlayers(
list as any[]
);





// Salle complète -> compte à rebours

if(

data.status === "starting"

&&

!startingRef.current

){


startingRef.current = true;



update(

ref(
database,
`rooms/${id}`
),

{

countdownStart:true,

countdownAt:
Date.now()

}

);


}






// Redirection compte à rebours

if(
data.status === "starting"
){


router.replace(
`/countdown/${id}`
);


return;

}





// Redirection jeu

if(
data.status === "playing"
){


router.replace(
`/game/${id}`
);


return;

}



}

);




return()=>unsubscribe();



},[
id,
router
]);








async function leaveRoom(){


try{


setLeaving(true);



const user =
auth.currentUser;



if(!user)
return;




const token =
await user.getIdToken();





const response =
await fetch(
"/api/game/leave",
{

method:"POST",


headers:{

"Content-Type":
"application/json",


"Authorization":
`Bearer ${token}`

},


body:JSON.stringify({

roomId:id

})


}

);





const data =
await response.json();




if(!response.ok){


throw new Error(
data.error || "Erreur"
);


}



router.push(
"/dashboard"
);



}
catch(error:any){


alert(
error.message
);


}
finally{


setLeaving(false);


}



}







if(!room){


return(

<main

className="
min-h-screen
bg-gradient-to-br
from-slate-950
via-blue-950
to-black
flex
items-center
justify-center
text-white
"

>

<p className="font-bold">

🎮 Chargement...

</p>


</main>

);


}return(

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
py-8
"

>



<motion.div

animate={{
x:[0,40,0],
y:[0,20,0]
}}

transition={{
duration:6,
repeat:Infinity
}}

className="
absolute
w-64
h-64
bg-blue-500/20
rounded-full
blur-3xl
top-0
left-[-80px]
"

/>





<motion.div

animate={{
x:[0,-40,0],
y:[0,-20,0]
}}

transition={{
duration:7,
repeat:Infinity
}}

className="
absolute
w-64
h-64
bg-cyan-500/20
rounded-full
blur-3xl
bottom-0
right-[-80px]
"

/>







<div

className="
relative
z-10
max-w-md
mx-auto
"

>



<BackButton />





<h1

className="
text-center
text-2xl
font-black
mb-6
bg-gradient-to-r
from-blue-400
to-cyan-300
bg-clip-text
text-transparent
"

>

🎮 Salle d'attente

</h1>







<div

className="
bg-white/10
border
border-white/20
backdrop-blur-xl
rounded-3xl
p-5
shadow-2xl
"

>



<h2

className="
text-center
text-xl
font-black
"

>

🎮 {room.name || "Partie TiTaTo"}

</h2>






<div

className="
mt-5
space-y-3
text-center
text-gray-300
"

>


<p>

💰 Mise :

<span className="
text-white
font-bold
">

{room.bet} HTG

</span>

</p>




<p>

🪙 Pot :

<span className="
text-green-400
font-bold
">

{room.pot || 0} HTG

</span>

</p>





<p>

👥 Joueurs :

<span className="
text-white
font-bold
">

{players.length}/{room.maxPlayers}

</span>

</p>



</div>








<div

className="
mt-6
space-y-3
"

>


{

players.map(

(player:any,index:number)=>(


<motion.div

key={
player.uid || index
}

initial={{
opacity:0,
x:-20
}}

animate={{
opacity:1,
x:0
}}

className="
bg-white/10
border
border-white/20
rounded-2xl
p-4
flex
justify-between
items-center
"

>



<div>

🟢 {player.name || "Joueur"}

</div>




<div

className="
font-black
text-xl
"

>

{player.symbol}

</div>



</motion.div>


)

)


}



</div>








{

players.length < room.maxPlayers &&


<div

className="
mt-6
text-center
text-gray-300
font-bold
"

>

⏳ En attente d'un joueur...

</div>


}








{

players.length >= room.maxPlayers &&


<div

className="
mt-6
text-center
text-green-400
font-black
animate-pulse
"

>

✅ Partie prête

<br/>

🚀 Lancement...

</div>


}










{

room.creatorId === auth.currentUser?.uid

&&

room.status === "waiting"

&&


<button

onClick={leaveRoom}

disabled={leaving}

className="
mt-6
w-full
py-3
rounded-xl
bg-red-600
font-black
shadow-lg
active:scale-95
transition
"

>


{

leaving

?

"Quitter..."

:

"❌ Quitter la partie"

}



</button>


}




</div>



</div>



</main>


);


}
"use client";

import {
  useEffect,
  useState
} from "react";

import {
  useRouter
} from "next/navigation";

import {
  motion
} from "framer-motion";

import {
  ref,
  onValue
} from "firebase/database";

import {
  database
} from "@/lib/firebase";

import BackButton from "@/components/BackButton";



export default function SpectatorList(){


const router = useRouter();


const [
rooms,
setRooms
]=useState<any[]>([]);



const [
loading,
setLoading
]=useState(true);





useEffect(()=>{


const roomsRef =
ref(
 database,
 "rooms"
);



const unsubscribe = onValue(


roomsRef,


(snapshot)=>{


const data =
snapshot.val();



if(!data){

setRooms([]);

setLoading(false);

return;

}





const allRooms =

Object.entries(data).map(

([id,room]:[string,any])=>({

id,

...room

})

);






// Garde les parties en cours + terminées

const spectatorRooms =

allRooms.filter(

room =>

room.status === "playing" ||

room.status === "finished"

);




setRooms(spectatorRooms);


setLoading(false);



},



(error)=>{


console.error(
"Erreur Firebase:",
error
);


setLoading(false);


}



);



return()=>unsubscribe();



},[]);









if(loading){


return(


<main

className="
min-h-screen
bg-gradient-to-br
from-[#020617]
via-[#07152f]
to-black
text-white
flex
items-center
justify-center
"

>


<p>

🎮 Chargement des parties...

</p>


</main>


);


}









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

px-3

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

w-56

h-56

bg-blue-500/20

rounded-full

blur-3xl

top-0

left-[-60px]

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

w-56

h-56

bg-purple-500/20

rounded-full

blur-3xl

bottom-10

right-[-60px]

"

/>







<div


className="

relative

z-10

w-full

max-w-md

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

mb-4

bg-gradient-to-r

from-blue-400

to-cyan-300

bg-clip-text

text-transparent

"

>


👁️ Mode Spectateur


</motion.h1>








<p

className="

text-center

text-xs

text-gray-400

mb-6

"

>


Regarde les parties en direct 🎮


</p>








{

rooms.length===0 ?



(



<motion.div


initial={{

opacity:0,

scale:.8

}}



animate={{

opacity:1,

scale:1

}}



className="

bg-white/10

backdrop-blur-2xl

border

border-white/20

rounded-3xl

p-6

text-center

"

>


<div className="text-4xl mb-4">

🎮

</div>



<h2 className="font-bold">

Aucune partie disponible

</h2>



<p className="text-xs text-gray-400 mt-3">

Reviens plus tard pour regarder une partie 👁️

</p>



</motion.div>



)

:

(



<div className="flex flex-col gap-4">


{

rooms.map((room,index)=>(




<motion.div


key={room.id}



initial={{

opacity:0,

y:30

}}



animate={{

opacity:1,

y:0

}}



transition={{

delay:index*0.1

}}



whileHover={{

scale:1.02,

y:-3

}}



className="

bg-white/10

backdrop-blur-2xl

border

border-white/20

rounded-3xl

p-5

shadow-xl

"

>







<div className="flex justify-between items-center mb-3">


<h2 className="font-bold">

🎮 {room.name || "Partie"}

</h2>





<span

className={

`

text-xs

font-bold

${

room.status==="finished"

?

"text-yellow-400"

:

"text-green-400"

}

`

}

>


{

room.status==="finished"

?

"🏆 TERMINÉ"

:

"🔴 LIVE"

}



</span>



</div>








<p className="text-xs text-gray-300">

💰 Mise : {room.bet || 0} HTG

</p>




<p className="text-xs text-gray-300 mt-2">

👥 Joueurs : {room.playersCount || 2}

</p>




<p className="text-xs text-gray-300 mt-2">

🎲 Mode : {room.mode || "1v1"}

</p>







<motion.button


whileHover={{

scale:1.03

}}



whileTap={{

scale:.95

}}



onClick={()=>router.push(`/spectator/${room.id}`)}



className="

mt-4

w-full

py-3

rounded-xl

font-bold

bg-gradient-to-b

from-purple-400

to-purple-700

shadow-[0_5px_0_#581c87]

"

>


👁️ Regarder


</motion.button>







</motion.div>



))


}



</div>



)

}




<motion.p


animate={{

opacity:[0.4,1,0.4]

}}



transition={{

duration:3,

repeat:Infinity

}}



className="

text-center

text-[10px]

text-cyan-300

font-bold

mt-8

"

>


🧪 Ti Ta To - Version bêta


</motion.p>





</div>



</main>



);


}
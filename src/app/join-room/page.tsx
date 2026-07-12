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
  onValue,
  set,
  update,
  serverTimestamp
} from "firebase/database";


import {
  database,
  auth
} from "@/lib/firebase";


import {
  checkUserBalance,
  deductBet
} from "@/lib/firebaseEconomy";


import BackButton from "@/components/BackButton";





export default function JoinRoomPage(){



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




const unsubscribe =

onValue(

roomsRef,

(snapshot)=>{


const data = snapshot.val();




if(!data){

setRooms([]);

setLoading(false);

return;

}





const list =

Object.entries(data)

.map(([id,room]:any)=>({

id,

...room

}))



.filter((room:any)=>

room.gameType==="titato"

&&

room.status==="waiting"

&&

room.type==="public"

&&

(room.playersCount || 0)

<

room.maxPlayers

);




setRooms(list);

setLoading(false);



}

);



return()=>unsubscribe();



},[]);









async function joinRoom(room:any){


try{


const user = auth.currentUser;



if(!user){

throw new Error(
"Connecte-toi d'abord"
);

}





const betAmount =
Number(room.bet);





const balance =

await checkUserBalance(
user.uid
);





if(balance < betAmount){

throw new Error(
`Solde insuffisant (${balance} HTG)`
);

}





if(room.players?.[user.uid]){

router.push(
`/room/${room.id}`
);

return;

}







await deductBet(

user.uid,

betAmount,

room.id

);








await set(

ref(

database,

`rooms/${room.id}/players/${user.uid}`

),

{

uid:user.uid,

name:user.displayName || "Joueur",

symbol:"O",

ready:true,

betPaid:true,

joinedAt:serverTimestamp()

}

);








const newPlayersCount =

(room.playersCount || 0)+1;







if(newPlayersCount >= room.maxPlayers){



await update(

ref(

database,

`rooms/${room.id}`

),

{

playersCount:newPlayersCount,

pot:Number(room.pot || 0)+betAmount,

status:"starting",

countdownStart:Date.now()

}

);



}

else{



await update(

ref(

database,

`rooms/${room.id}`

),

{

playersCount:newPlayersCount,

pot:Number(room.pot || 0)+betAmount

}

);



}







router.push(

`/room/${room.id}`

);



}


catch(error:any){


alert(

error.message || "Erreur"

);


}



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

px-4

py-10

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

left:-60px

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

bg-green-500/20

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

from-blue-400

to-cyan-300

bg-clip-text

text-transparent

"

>


🚀 Rejoindre une partie


</motion.h1>









{

loading &&

<p className="text-center text-gray-400">

Chargement...

</p>

}









{

!loading && rooms.length===0 &&


<div

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

🎮 Aucune partie disponible


</div>


}









<div

className="

flex

flex-col

gap-4

"

>






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





<h2 className="font-black text-lg">

🎲 {room.name || "Ti Ta To"}

</h2>





<p className="text-sm text-gray-300 mt-3">

💰 Mise : {room.bet} HTG

</p>





<p className="text-sm text-gray-300 mt-2">

👥 Joueurs :

{room.playersCount || 0}

/

{room.maxPlayers}

</p>








<motion.button


whileHover={{

scale:1.03

}}



whileTap={{

scale:.95

}}



onClick={()=>joinRoom(room)}



className="

mt-5

w-full

py-3

rounded-xl

font-bold

bg-gradient-to-b

from-green-400

to-green-700

shadow-[0_5px_0_#166534]

"

>


🚀 Rejoindre


</motion.button>






</motion.div>


))


}



</div>






</div>


</main>


);



}
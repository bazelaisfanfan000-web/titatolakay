"use client";

import {
  useEffect,
  useState
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
  update,
  serverTimestamp
} from "firebase/database";

import {
  database
} from "@/lib/firebase";

import BackButton from "@/components/BackButton";

export default function RoomPage(){

const params = useParams();

const router = useRouter();

const id = params.id as string;

const [room,setRoom] =
useState<any>(null);

const [players,setPlayers] =
useState<any[]>([]);

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

if(

list.length === data.maxPlayers

&&

data.status === "waiting"

){

const playersWithSymbol:any = {};

(list as any[]).forEach(

(player:any,index:number)=>{

playersWithSymbol[player.uid]={

...player,

symbol:

index === 0

?

"X"

:

"O"

};

}

);

const board =

Array.from(

{
length:10
},

()=>Array(10).fill("")

);

update(

ref(
database,
`rooms/${id}`
),

{

status:"starting",

countdownStart:
serverTimestamp(),

players:
playersWithSymbol,

game:{

board,

turn:"X",

winner:"",

status:"starting",

turnStartedAt:null,

paymentDone:false

}

}

);

}

if(

data.status === "starting"

&&

data.countdownStart

){

router.push(
`/countdown/${id}`
);

return;

}

if(
data.status === "playing"
){

router.push(
`/game/${id}`
);

return;

}

}

);

return ()=>unsubscribe();

},[
id,
router
]);

if(!room){

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

<p className="font-bold">
🎮 Chargement...
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

🎮 Salle d'attente

</motion.h1>

<div

className="
bg-white/10
backdrop-blur-2xl
border
border-white/20
rounded-3xl
p-6
shadow-xl
text-center
"

>

<h2 className="
text-2xl
font-black
">

🎮 {room.name || "Ti Ta To"}

</h2>

<p className="
mt-4
text-gray-300
">

💰 Mise : {room.bet} HTG

</p>

<p className="
mt-2
text-gray-300
">

👥 Joueurs : {players.length}/{room.maxPlayers}

</p>

<div className="
mt-6
flex
flex-col
gap-3
">

{
players.map((player:any,index:number)=>(

<motion.div

key={player.uid || index}

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

{
player.symbol && (

<span

className={

player.symbol==="X"

?

"text-blue-400 font-black"

:

"text-red-400 font-black"

}

>

({player.symbol})

</span>

)
}

</motion.div>

))
}

</div>

{
players.length < room.maxPlayers && (

<motion.p

animate={{
opacity:[0.4,1,0.4]
}}

transition={{
duration:2,
repeat:Infinity
}}

className="
mt-6
text-gray-300
font-bold
"

>

⏳ En attente d'un joueur...

</motion.p>

)
}

{
players.length === room.maxPlayers && (

<motion.p

animate={{
scale:[1,1.05,1]
}}

transition={{
duration:1,
repeat:Infinity
}}

className="
mt-6
text-green-400
font-black
"

>

✅ Salle complète

<br />

Préparation de la partie...

</motion.p>

)
}

</div>

</div>

</main>

);

}
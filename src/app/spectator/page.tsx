"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ref,
  onValue
} from "firebase/database";

import {
  database
} from "@/lib/firebase";


export default function SpectatorList(){

const router = useRouter();
const [rooms,setRooms] = useState<any[]>([]);
const [loading,setLoading] = useState(true);


useEffect(()=>{

const roomsRef = ref(database,"rooms");

const unsubscribe = onValue(
roomsRef,
(snapshot)=>{

const data = snapshot.val();

if(!data){
setRooms([]);
setLoading(false);
return;
}


const allRooms = Object.entries(data).map(([id,room]:[string,any])=>({
id,
...room
}));


const playingRooms = allRooms.filter(
room=>room.status === "playing"
);

setRooms(playingRooms);
setLoading(false);

},
(error)=>{
console.error("Erreur Firebase:",error);
setLoading(false);
}
);

return ()=>unsubscribe();

},[]);


if(loading){
return(
<main className="
min-h-screen
bg-black
text-white
flex
items-center
justify-center
">

<div className="text-center">
<p>🎮 Chargement des parties...</p>
</div>

</main>
);
}


return(
<main className="
min-h-screen
bg-black
text-white
p-4
">

<div className="
max-w-sm
mx-auto
">


<h1 className="
text-2xl
font-black
text-center
mb-6
">

👁️ Mode Spectateur

</h1>


<p className="
text-center
text-gray-400
mb-6
">
Regarde les parties en direct
</p>


{
rooms.length === 0 ? (

<div className="
bg-white/10
rounded-2xl
p-6
text-center
">

<div className="
text-4xl
mb-4
">
🎮
</div>

<h2 className="
font-bold
mb-2
">
Aucune partie en direct
</h2>

<p className="
text-sm
text-gray-400
">
Reviens plus tard pour voir des parties en cours 👁️
</p>

</div>

) : (

<div className="
flex
flex-col
gap-3
">

{
rooms.map((room)=>(

<div
key={room.id}
className="
bg-white/10
border
border-white/20
rounded-2xl
p-4
">

<div className="
flex
justify-between
items-start
mb-3
">

<h2 className="
font-bold
text-lg
">
🎮 {room.name || "Partie"}
</h2>

<span className="
text-green-400
text-xs
font-bold
">
🔴 LIVE
</span>

</div>


<div className="
flex
flex-col
gap-2
mb-4
">

<p className="
text-sm
text-gray-300
">
💰 Mise : {room.bet || 0} HTG
</p>


<p className="
text-sm
text-gray-300
">
👥 Joueurs : {room.playersCount || 2}
</p>


<p className="
text-sm
text-gray-300
">
🎲 Mode : {room.mode || "1v1"}
</p>

</div>


<button
onClick={()=>router.push(`/spectator/${room.id}`)}
className="
w-full
bg-purple-600
py-3
rounded-xl
font-bold
hover:bg-purple-700
transition-all
"
>
👁️ Regarder
</button>

</div>

))
}

</div>
)
}


<button
onClick={()=>router.push("/dashboard")}
className="
mt-6
w-full
bg-white/10
py-3
rounded-xl
font-bold
hover:bg-white/20
transition-all
"
>
← Retour au dashboard
</button>


</div>

</main>
);

}

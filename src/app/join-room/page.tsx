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
  auth,
  database
} from "@/lib/firebase";


import {
  useRouter
} from "next/navigation";



type Room = {

  id:string;

  name:string;

  bet:number;

  mode:"1vs1" | "2vs2" | string;

  gameType:"titato" | "dominos" | string;

  playersCount:number;

  maxPlayers:number;

  status:string;

};





export default function JoinGame(){



const router = useRouter();



const [
rooms,
setRooms
] = useState<Room[]>([]);



const [
loading,
setLoading
] = useState(false);





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


const data =
snapshot.val();



if(!data){

setRooms([]);

return;

}



const list:Room[] = [];





Object.entries(data)
.forEach(
([id,value]:any)=>{


if(

value.status === "waiting"

&&

value.playersCount < value.maxPlayers

){


list.push({

id,

name:
value.name || "Partie TiTaTo",

bet:
Number(value.bet || 0),

mode:
value.mode || "1vs1",

gameType:
value.gameType || "titato",

playersCount:
Number(value.playersCount || 0),

maxPlayers:
Number(value.maxPlayers || 2),

status:
value.status


});


}


});


setRooms(list);



}

);



return()=>unsubscribe();



},[]);







async function joinRoom(
roomId:string
){



try{


setLoading(true);



const user =
auth.currentUser;



if(!user){


alert(
"Vous devez être connecté"
);


return;


}



const token =
await user.getIdToken();





const response =
await fetch(
"/api/game/join",
{

method:"POST",

headers:{

"Content-Type":
"application/json",

"Authorization":
`Bearer ${token}`

},


body:JSON.stringify({

roomId

})


}

);





const data =
await response.json();





if(!response.ok){


throw new Error(
data.error ||
"Impossible de rejoindre"
);


}






router.push(
`/room/${roomId}`
);




}

catch(error:any){


alert(
error.message
);


}

finally{


setLoading(false);


}



}









return (

<div

className="
min-h-screen
bg-gradient-to-br
from-slate-950
via-slate-900
to-black
px-4
py-5
text-white
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
text-blue-400
font-bold
mb-6
"

>

← Retour

</button>





<h1

className="
text-3xl
font-black
mb-1
"

>

🎮 Rejoindre TiTaTo

</h1>



<p

className="
text-gray-400
text-sm
mb-6
"

>

Choisis une partie en attente

</p>






{
rooms.length === 0 &&


<div

className="
bg-white/10
backdrop-blur-xl
border
border-white/10
rounded-3xl
p-6
text-center
"

>

<div
className="
text-3xl
mb-2
"
>

🎲

</div>


<p
className="
font-bold
"
>

Aucune partie disponible

</p>


</div>

}





<div

className="
space-y-4
"

>


{
rooms.map((room)=>(



<div

key={room.id}

className="
bg-white/10
backdrop-blur-xl
border
border-white/20
rounded-3xl
p-5
shadow-xl
"

>



<div

className="
flex
justify-between
items-center
mb-4
"

>


<div>


<h2

className="
font-black
text-lg
"

>

🔥 {room.name}

</h2>



<p

className="
text-xs
text-gray-400
"

>


{

room.gameType==="titato"

?

"⭕ TiTaTo"

:

"🁫 Dominos"

}


</p>


</div>



<div

className="
bg-blue-500/20
border
border-blue-400/30
rounded-xl
px-3
py-1
text-xs
font-bold
"

>

{room.mode}

</div>



</div>






<div

className="
grid
grid-cols-2
gap-3
mb-4
"

>



<div

className="
bg-black/30
rounded-2xl
p-3
"

>


<p

className="
text-xs
text-gray-400
"

>

Mise

</p>


<p
className="
font-black
"

>

💰 {room.bet} HTG

</p>


</div>






<div

className="
bg-black/30
rounded-2xl
p-3
"

>


<p

className="
text-xs
text-gray-400
"

>

Joueurs

</p>


<p

className="
font-black
"

>

👥 {room.playersCount}/{room.maxPlayers}

</p>


</div>



</div>







<button


disabled={loading}


onClick={()=>joinRoom(room.id)}



className="
w-full
py-3
rounded-2xl
font-black
bg-gradient-to-b
from-blue-400
to-blue-700
border-b-4
border-blue-950
shadow-[0_6px_0_#00143d]
active:translate-y-1
active:border-b-0
transition
"

>


{

loading

?

"Connexion..."

:

"🎮 Rejoindre"

}



</button>





</div>


))


}



</div>



</div>


</div>


);



}
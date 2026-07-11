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
  ref,
  onValue,
  update
} from "firebase/database";


import {
  database
} from "@/lib/firebase";





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



if(!data){

return;

}





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







// ===============================
// SALLE COMPLETE
// CREATION PARTIE
// ===============================



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


});







const board =

Array.from(

{length:10},

()=>Array(10).fill("")

);







update(

ref(

database,

`rooms/${id}`

),

{


status:"starting",


countdownStart:Date.now(),



players:playersWithSymbol,



game:{


board,


turn:"X",


winner:"",


status:"starting",


turnStartedAt:Date.now(),


paymentDone:false


}



}

);



}









// ===============================
// REDIRECTION COMPTE A REBOURS
// ===============================



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









// ===============================
// REDIRECTION JEU
// ===============================



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



},[id,router]);









if(!room){


return(

<div

className="
min-h-screen
bg-black
text-white
flex
items-center
justify-center
"

>

Chargement...

</div>

);


}









return(

<main

className="
min-h-screen
bg-black
text-white
flex
items-center
justify-center
p-4
"

>


<div

className="
w-full
max-w-sm
bg-white/10
border
border-white/20
rounded-3xl
p-6
text-center
"

>





<h1

className="
text-2xl
font-bold
"

>

🎮 {room.name || "Ti Ta To"}

</h1>







<p className="mt-4">

💰 Mise :

{room.bet}

HTG

</p>







<p>

👥 Joueurs :

{" "}

{players.length}

/

{room.maxPlayers}

</p>










<div className="mt-5">


{

players.map(

(player:any,index:number)=>(



<div

key={
player.uid || index
}

className="
bg-white/10
rounded-xl
p-3
mb-2
"

>


🟢 {player.name || "Joueur"}



{

player.symbol &&


<span

className={`

ml-2

font-bold

${

player.symbol==="X"

?

"text-blue-500"

:

"text-red-500"

}

`}

>

({player.symbol})

</span>


}



</div>



)

)


}


</div>









{

players.length < room.maxPlayers &&


<p

className="
mt-5
text-gray-400
"

>

⏳ En attente d'un joueur...

</p>


}









{

players.length === room.maxPlayers &&


<p

className="
mt-5
text-green-400
font-bold
"

>

✅ Salle complète

Préparation de la partie...

</p>


}





</div>


</main>


);


}
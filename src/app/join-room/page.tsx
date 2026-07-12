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





export default function JoinRoomPage(){


const router = useRouter();


const [rooms,setRooms] =
useState<any[]>([]);


const [loading,setLoading] =
useState(true);





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

room.status==="waiting"

&&

room.type==="public"

&&

room.playersCount < room.maxPlayers

);



setRooms(list);


setLoading(false);


}

);



return ()=>unsubscribe();


},[]);









async function joinRoom(room:any){


try{


const user =
auth.currentUser;



if(!user){

throw new Error(
"Connecte-toi d'abord"
);

}




const betAmount =
Number(room.bet);





// vérifier solde

const balance =
await checkUserBalance(
user.uid
);



if(balance < betAmount){

throw new Error(
`Solde insuffisant (${balance} HTG)`
);

}






// empêcher double entrée

if(room.players?.[user.uid]){


router.push(
`/room/${room.id}`
);


return;

}






// retirer la mise

await deductBet(

user.uid,

betAmount,

room.id

);







// ajouter joueur

await set(

ref(

database,

`rooms/${room.id}/players/${user.uid}`

),

{


uid:user.uid,


name:
user.displayName || "Joueur",


symbol:"O",


ready:true,


betPaid:true,


joinedAt:
serverTimestamp()


}

);








const newPlayersCount =
(room.playersCount || 0) + 1;








// mise à jour partie

await update(

ref(

database,

`rooms/${room.id}`

),

{


playersCount:
newPlayersCount,



pot:
Math.floor(
(room.pot || 0) + betAmount
),




status:

newPlayersCount >= room.maxPlayers

?

"started"

:

"waiting",





gameStartAt:

newPlayersCount >= room.maxPlayers

?

Date.now()

:

null



}

);







router.push(

`/room/${room.id}`

);




}
catch(error:any){


console.error(
error
);


alert(
error.message || "Erreur"
);


}



}








return(


<main className="
min-h-screen
bg-black
text-white
p-4
">


<div className="
max-w-md
mx-auto
">



<h1 className="
text-2xl
font-bold
text-center
mb-6
">

🎮 Rejoindre une partie

</h1>






{
loading &&

<p className="
text-center
text-gray-400
">

Chargement...

</p>

}








{
!loading && rooms.length===0 &&


<div className="
bg-white/10
rounded-2xl
p-5
text-center
">

🎮 Aucune partie disponible


</div>

}







<div className="
space-y-4
">


{

rooms.map((room)=>(


<div

key={room.id}

className="
bg-white/10
border
border-white/20
rounded-3xl
p-5
"

>



<h2 className="
font-bold
text-xl
">

🎲 {room.name}

</h2>





<p className="mt-2">

💰 Mise :
{room.bet} HTG

</p>





<p>

👥 Joueurs :

{" "}

{room.playersCount}/{room.maxPlayers}

</p>







<button

onClick={()=>joinRoom(room)}

className="
mt-4
w-full
bg-green-600
py-3
rounded-xl
font-bold
"

>

🚀 Rejoindre

</button>





</div>


))

}


</div>





</div>


</main>


);


}
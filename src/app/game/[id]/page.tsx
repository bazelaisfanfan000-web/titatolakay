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
  ref,
  onValue,
  remove
} from "firebase/database";


import {
  database,
  auth
} from "@/lib/firebase";


import {
  playGameMove,
  finishGamePayment
} from "@/lib/firebaseGame";


import {
  addPlayerWin,
  addPlayerLose
} from "@/lib/playerStats";


import {
  sendFriendRequest,
  checkFriendStatus
} from "@/lib/friends";


import TiTaToBoard from "@/components/TiTaToBoard";

import GameTimer from "@/components/GameTimer";

import WinnerModal from "@/components/WinnerModal";

import GameChat from "@/components/GameChat";




export default function GamePage(){


const params =
useParams();


const router =
useRouter();



const id =
params.id as string;



const [room,setRoom] =
useState<any>(null);



const [board,setBoard] =
useState<string[][]>(

Array.from(
{
length:10
},
()=>Array(10).fill("")
)

);



const [turn,setTurn] =
useState<"X"|"O">("X");



const [winner,setWinner] =
useState<string|null>(null);



const [mySymbol,setMySymbol] =
useState<
"X"|"O"| ""
>("");



const [turnStartedAt,setTurnStartedAt] =
useState<number>(0);



const [friendStatus,setFriendStatus] =
useState<
"none" |
"pending" |
"friend"
>("none");



const paymentDone =
useRef(false);





// ==========================
// FIREBASE ROOM
// ==========================

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



if(data.game?.board){

setBoard(
data.game.board
);

}
else{

setBoard(

Array.from(
{
length:10
},
()=>Array(10).fill("")
)

);

}





if(data.game?.turn){

setTurn(
data.game.turn
);

}




setWinner(
data.game?.winner || null
);



setTurnStartedAt(
data.game?.turnStartedAt || 0
);






const user =
auth.currentUser;



if(
user &&
data.players?.[user.uid]
){

setMySymbol(
data.players[user.uid].symbol
);

}



}

);



return ()=>unsubscribe();



},[id]);





// ==========================
// VERIFIER AMI
// ==========================


useEffect(()=>{


if(
!room ||
!auth.currentUser ||
!room.players
)
return;



const me =
auth.currentUser.uid;



const opponent =
Object.keys(room.players)
.find(
uid=>uid!==me
);



if(!opponent)
return;



checkFriendStatus(
me,
opponent
)
.then(status=>{


setFriendStatus(status as any);


});



},[room]);





// ==========================
// PAIEMENT GAGNANT
// ==========================


useEffect(()=>{


if(!room)
return;



if(
room.game?.status !== "finished"
)
return;



if(
!room.game?.winner ||
room.game.winner==="draw"
)
return;



if(
room.game.paymentDone === true
)
return;



if(
paymentDone.current
)
return;



paymentDone.current=true;




async function pay(){


try{


const result =
await finishGamePayment(
id
);



if(result.success){


await addPlayerWin(
result.winnerUid
);



Object.keys(
room.players || {}
)
.forEach((uid)=>{


if(
uid !== result.winnerUid
){


addPlayerLose(uid);


}


});




// SUPPRESSION AUTOMATIQUE DE LA PARTIE

setTimeout(async()=>{


await remove(

ref(

database,

`rooms/${id}`

)

);


console.log(
"✅ Partie supprimée"
);



},5000);



}



}
catch(error){


console.log(
"PAYMENT ERROR",
error
);


}



}



pay();



},[
room,
id
]);// ==========================
// JOUER UN COUP
// ==========================


async function handleMove(

row:number,

col:number

){


if(!mySymbol)
return;



if(
turn !== mySymbol
){


alert(
"Ce n'est pas ton tour"
);


return;


}



try{


await playGameMove(

id,

row,

col,

mySymbol

);



}
catch(error:any){


alert(
error.message
);


}



}









// ==========================
// DEMANDE AMI
// ==========================


async function handleAddFriend(){


const user =
auth.currentUser;



if(!user)
return;



if(!room?.players)
return;




const opponentId =
Object.keys(room.players)
.find(
uid=>uid!==user.uid
);



if(!opponentId)
return;



await sendFriendRequest(

user.uid,

opponentId

);



setFriendStatus(
"pending"
);



alert(
"📩 Demande d'ami envoyée"
);



}









// ==========================
// CHARGEMENT
// ==========================


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






const user =
auth.currentUser;




const reward =

Math.floor(

Number(room.pot || 0)

*

0.9

);






return(


<main

className="
min-h-screen
bg-gradient-to-br
from-black
via-blue-950
to-black
text-white
p-4
flex
flex-col
items-center
"

>


<h1

className="
text-2xl
font-black
mb-4
"

>

🎮 {room.name}

</h1>







<div

className="
bg-yellow-500/10
border
border-yellow-400/20
rounded-2xl
p-4
text-center
mb-4
"

>

💰 POT

<br/>


<span

className="
text-yellow-400
font-black
text-xl
"

>

{room.pot} HTG

</span>


</div>







<div

className="
mb-4
"

>

Votre symbole :


<span

className="
ml-2
font-black
text-xl
"

>

{mySymbol}

</span>


</div>









<TiTaToBoard

board={board}

mySymbol={mySymbol}

turn={turn}

winner={winner}

playMove={handleMove}

/>









<GameTimer

turnStartedAt={turnStartedAt}

isMyTurn={
turn === mySymbol
}

onTimeout={()=>{}}

/>









<GameChat

roomId={id}

uid={
user?.uid || ""
}

name={
user?.displayName || "Joueur"
}

/>









{

winner &&


<WinnerModal


winner={winner}


mySymbol={mySymbol}


reward={reward}


friendStatus={friendStatus}


onAddFriend={handleAddFriend}



onClose={()=>{


router.push(
"/dashboard"
);


}}


/>


}



</main>


);


}
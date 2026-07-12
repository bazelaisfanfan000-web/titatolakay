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
  onValue
} from "firebase/database";


import {
  database,
  auth
} from "@/lib/firebase";



import {
  playGameMove,
  finishGamePayment,
  requestRematch,
  acceptRematch,
  rejectRematch
} from "@/lib/firebaseGame";



import {
  addPlayerWin,
  addPlayerLose
} from "@/lib/playerStats";



import TiTaToBoard from "@/components/TiTaToBoard";

import GameTimer from "@/components/GameTimer";

import WinnerModal from "@/components/WinnerModal";

import RematchModal from "@/components/RematchModal";

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
useState<string[][]>([]);


const [turn,setTurn] =
useState<"X"|"O">("X");


const [winner,setWinner] =
useState<string|null>(null);



const [mySymbol,setMySymbol] =
useState<"X"|"O"|"">("");



const [turnStartedAt,setTurnStartedAt] =
useState(0);



const [rematch,setRematch] =
useState<any>(null);




const paymentDone =
useRef(false);










// ==========================
// ECOUTE PARTIE
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






setRematch(

data.rematch || null

);





if(data.status==="starting"){


router.push(

`/countdown/${id}`

);


}



}

);



return ()=>unsubscribe();



},[id,router]);











// ==========================
// PAIEMENT FIN PARTIE
// ==========================


useEffect(()=>{


if(!room)
return;



if(room.game?.status !== "finished")
return;



if(!room.game?.winner)
return;



if(paymentDone.current)
return;



paymentDone.current=true;





async function pay(){



let winnerUid="";

let loserUid="";





Object.entries(room.players || {})

.forEach(([uid,p]:any)=>{



if(
p.symbol === room.game.winner
){

winnerUid=uid;

}

else{

loserUid=uid;

}


});







if(winnerUid){


await addPlayerWin(
winnerUid
);



await finishGamePayment(

id,

winnerUid

);


}






if(loserUid){


await addPlayerLose(

loserUid

);


}




}



pay();



},[room,id]);











// ==========================
// JOUEUR
// ==========================


async function handleMove(

row:number,

col:number

){



if(!mySymbol)
return;



if(turn !== mySymbol){

alert(
"Ce n'est pas ton tour"
);


return;

}



await playGameMove(

id,

row,

col,

mySymbol

);



}











// ==========================
// REVANCHE
// ==========================


async function askRematch(){


const user =
auth.currentUser;



if(!user)
return;



await requestRematch(

id,

user.uid,

user.displayName || "Joueur"

);



}







async function accept(){


const user =
auth.currentUser;



if(!user)
return;



const result =

await acceptRematch(

id,

user.uid

);





if(result.success && result.roomId){


router.push(

`/countdown/${result.roomId}`

);


}



if(result.error){

alert(
result.error
);

}


}









async function reject(){


const user =
auth.currentUser;



if(!user)
return;



await rejectRematch(

id,

user.uid

);



router.push(

"/dashboard"

);



}









if(!room){


return(

<div className="min-h-screen bg-black text-white flex items-center justify-center">

Chargement...

</div>

);


}







const currentUser =
auth.currentUser;



const myTurn =
turn===mySymbol;



const reward =

Math.floor(

Number(room.pot || 0)

*

0.8

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
"

>



<h1 className="
text-center
text-3xl
font-black
">

🎮 {room.name || "Ti Ta To"}

</h1>





<div className="
mt-5
text-center
bg-yellow-500/10
rounded-2xl
p-4
">

💰 POT

<div className="
text-3xl
font-black
text-yellow-400
">

{room.pot} HTG

</div>

</div>






<TiTaToBoard

board={board}

mySymbol={mySymbol as "X"|"O"}

turn={turn}

winner={winner}

playMove={handleMove}

/>







<GameTimer

turnStartedAt={turnStartedAt}

isMyTurn={myTurn}

onTimeout={()=>{}}

/>








<GameChat

roomId={id}

uid={currentUser?.uid || ""}

name={
currentUser?.displayName || "Joueur"
}

/>








{
winner &&

<WinnerModal

winner={winner}

mySymbol={mySymbol}

reward={reward}

onClose={()=>router.push("/dashboard")}

onRequestRematch={askRematch}

/>

}








{
rematch && currentUser &&


<RematchModal


requestedBy={rematch.requestedBy}


requesterName={
rematch.requesterName || "Joueur"
}


myUid={currentUser.uid}


onAccept={accept}


onReject={reject}


/>

}





</main>


);


}
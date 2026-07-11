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





export default function GamePage(){


const params = useParams();

const router = useRouter();


const id = params.id as string;



const [room,setRoom] =
useState<any>(null);



const [board,setBoard] =
useState<string[][]>([]);



const [turn,setTurn] =
useState<"X"|"O">("X");



const [winner,setWinner] =
useState("");



const [mySymbol,setMySymbol] =
useState<"X"|"O"|"">("");



const [turnStartedAt,setTurnStartedAt] =
useState(0);



const [rematch,setRematch] =
useState<any>(null);



const paymentInitiatedRef =
useRef(false);






// =============================
// ECOUTE SALLE
// =============================


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

setRoom(null);

return;

}




setRoom(data);





if(
data.status==="starting"
&&
data.countdownStart
){

router.push(
`/countdown/${id}`
);

return;

}





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







if(
data.game?.turn==="X"
||
data.game?.turn==="O"
){

setTurn(
data.game.turn
);

}





if(
data.game?.winner
){

setWinner(
data.game.winner
);

}

else{

setWinner("");

}







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





if(data.rematch){

setRematch(
data.rematch
);

}

else{

setRematch(null);

}




}



);





return()=>unsubscribe();



},[
id,
router
]);
// =============================
// FIN DE PARTIE
// CLASSEMENT + PAIEMENT
// =============================

useEffect(()=>{


if(!room)
return;


if(
room.game?.status !== "finished"
)
return;


if(
!room.game?.winner
)
return;



if(
paymentInitiatedRef.current
)
return;



paymentInitiatedRef.current = true;




async function finishGame(){


try{



const players =
room.players || {};



let winnerUid = "";

let loserUid = "";





Object.entries(players)

.forEach(
([uid,player]:any)=>{


if(
player.symbol === room.game.winner
){

winnerUid = uid;

}

else{

loserUid = uid;

}


}

);





// ======================
// AJOUT CLASSEMENT
// ======================


if(winnerUid){

console.log("📊 Ajout victoire pour:", winnerUid);
await addPlayerWin(
winnerUid
);

}



if(loserUid){

console.log("📊 Ajout défaite pour:", loserUid);
await addPlayerLose(
loserUid
);

}







// ======================
// PAIEMENT
// ======================


console.log("💰 Lancement paiement pour winnerUid:", winnerUid);
console.log("💰 Pot actuel:", room.pot);

await finishGamePayment(

id,

winnerUid

);



console.log(
"🏆 Classement mis à jour et paiement effectué"
);



}

catch(error){

console.error(
"Erreur fin partie",
error
);


}



}



finishGame();



},[
room,
id
]);









// =============================
// JOUER UN COUP
// =============================


async function handlePlayMove(

row:number,

col:number

){



if(!mySymbol){

alert(
"❌ Symbole introuvable"
);

return;

}





if(winner){

alert(
"🏆 Partie terminée"
);

return;

}





if(turn !== mySymbol){

alert(
"⏳ Ce n'est pas ton tour"
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
error.message || "Erreur"
);


}



}









// =============================
// REVANCHE
// =============================


async function handleRequestRematch(){


if(!auth.currentUser)
return;



await requestRematch(

id,

auth.currentUser.uid

);


}






async function handleAcceptRematch(){


try{


await acceptRematch(id);


}

catch(error:any){


alert(
error.message
);


}



}






async function handleRejectRematch(){


await rejectRematch(id);


}









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








const myTurn =
turn === mySymbol;






const reward =

room.game?.reward ||

Math.floor(
Number(room.pot || 0)*0.9
);








return(

<main

className="
min-h-screen
bg-black
text-white
p-4
"

>




<h1

className="
text-center
text-2xl
font-bold
"

>

🎮 {room.name || "Ti Ta To"}

</h1>






<p

className="
text-center
mt-3
"

>

💰 Pot :

<b>

{room.pot || 0} HTG

</b>

</p>








<p

className="
text-center
mt-2
"

>

Ton symbole :

<b>

{mySymbol}

</b>

</p>







{

myTurn ?

<p

className="
text-center
text-green-400
font-bold
mt-3
"

>

🟢 Ton tour

</p>


:

<p

className="
text-center
text-yellow-400
mt-3
"

>

⏳ Tour de {turn}

</p>


}







<GameTimer

turnStartedAt={turnStartedAt}

isMyTurn={myTurn}

onTimeout={()=>{}}

/>









<TiTaToBoard

board={board}

mySymbol={
mySymbol as "X"|"O"
}

turn={turn}

winner={
winner || null
}

playMove={
handlePlayMove
}

/>








<button

onClick={()=>router.push("/dashboard")}

className="
mt-6
w-full
bg-red-600
py-3
rounded-xl
font-bold
"

>

❌ Quitter

</button>









{

winner &&

<WinnerModal

winner={winner}

mySymbol={mySymbol}

reward={reward}

onClose={
()=>router.push("/dashboard")
}

onRequestRematch={
handleRequestRematch
}

/>

}









{

rematch
&&
auth.currentUser

&&


<RematchModal

requestedBy={
rematch.requestedBy
}

myUid={
auth.currentUser.uid
}

onAccept={
handleAcceptRematch
}

onReject={
handleRejectRematch
}

/>

}



</main>

);


}
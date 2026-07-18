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
  playGameMove
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


const params = useParams();

const router = useRouter();


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
"none"|
"pending"|
"friend"
>("none");



// MESSAGE UI

const [friendMessage,setFriendMessage] =
useState("");

const [gameMessage,setGameMessage] =
useState("");



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


},[id]);// ==========================
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
room.game.paymentStatus === "completed"
)
return;



if(
paymentDone.current
)
return;



paymentDone.current=true;




async function pay(){


try{


const user =
auth.currentUser;



if(!user){

throw new Error(
"Utilisateur non connecté"
);

}



const token =
await user.getIdToken();



const res =
await fetch(

"/api/game/finish-payment",

{

method:"POST",

headers:{

"Content-Type":
"application/json",

"authorization":
`Bearer ${token}`

},

body:JSON.stringify({

gameId:id

})

}

);



const result =
await res.json();



if(
!res.ok ||
!result.success
){

throw new Error(
result?.error ||
"Erreur paiement"
);

}



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





setTimeout(async()=>{


await remove(

ref(

database,

`rooms/${id}`

)

);


},5000);



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
]);







// ==========================
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


setGameMessage(
"⏳ Ce n'est pas ton tour"
);



setTimeout(()=>{


setGameMessage("");

},2500);



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


setGameMessage(

"❌ " + error.message

);



setTimeout(()=>{


setGameMessage("");

},2500);



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





setFriendMessage(

"📩 Demande d'ami envoyée"

);





setTimeout(()=>{


setFriendMessage("");

},3000);



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




const bet =
Number(room.bet || 0);




const pot =
Number(room.pot || 0);




const commission =
Math.floor(
pot * 0.1
);




const reward =
Math.floor(
pot * 0.9
);return(


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

{pot} HTG

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

userName={
user?.displayName || "Joueur"
}

/>









{

winner &&


<WinnerModal


winner={winner}


mySymbol={mySymbol}


reward={reward}


bet={bet}


pot={pot}


commission={commission}


friendStatus={friendStatus}



onAddFriend={handleAddFriend}





onClose={()=>{


router.push(

"/dashboard"

);


}}



/>


}








{/* MESSAGE DEMANDE AMI */}

{

friendMessage &&


<div

className="
fixed
bottom-24
left-1/2
-translate-x-1/2
bg-blue-600
text-white
px-5
py-3
rounded-2xl
shadow-xl
font-bold
z-50
"

>

{friendMessage}

</div>

}







{/* MESSAGE JEU */}

{

gameMessage &&


<div

className="
fixed
bottom-24
left-1/2
-translate-x-1/2
bg-red-600
text-white
px-5
py-3
rounded-2xl
shadow-xl
font-bold
z-50
"

>

{gameMessage}

</div>

}





</main>


);


}
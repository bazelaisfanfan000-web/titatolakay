import {
  ref,
  get,
  update
} from "firebase/database";

import {
  database
} from "@/lib/firebase";


import {
  makeMove,
  checkWinner
} from "./tttEngine";





// =====================================
// JOUER UN COUP
// =====================================

export async function playGameMove(

roomId:string,

row:number,

col:number,

symbol:"X"|"O"

){


const roomRef =
ref(
database,
`rooms/${roomId}`
);




const snap =
await get(roomRef);




if(!snap.exists()){

throw new Error(
"Partie introuvable"
);

}





const room =
snap.val();

const game =
room.game;





if(!game){

throw new Error(
"Jeu introuvable"
);

}





if(game.status === "finished"){

throw new Error(
"La partie est terminée"
);

}





if(game.turn !== symbol){

throw new Error(
"Ce n'est pas ton tour"
);

}





if(
game.board[row][col] !== ""
){

throw new Error(
"Cette case est déjà utilisée"
);

}





const newBoard =
makeMove(

game.board,

row,

col,

symbol

);




const winner =
checkWinner(newBoard);





const updates:any = {

[`game/board`]:
newBoard

};





// ===============================
// FIN DE PARTIE
// ===============================

if(winner){



updates["game/status"] =
"finished";




updates["game/winner"] =
winner;




updates["game/finishedAt"] =
Date.now();




updates["game/paymentDone"] =
false;




updates["game/finalPot"] =
Math.floor(
Number(room.pot || 0)
);




}


else{



updates["game/turn"] =

symbol === "X"
?
"O"
:
"X";




updates["game/turnStartedAt"] =
Date.now();





}





await update(

roomRef,

updates

);




}





// =====================================
// PAIEMENT GAGNANT
// =====================================

export async function finishGamePayment(

roomId:string,

winnerUid:string

){



const roomRef =
ref(
database,
`rooms/${roomId}`
);




const snap =
await get(roomRef);




if(!snap.exists()){

throw new Error(
"Salle introuvable"
);

}





const room =
snap.val();





if(
room.game?.paymentDone === true
){

return {

message:
"Paiement déjà effectué"

};

}





console.log("💰 finishGamePayment appelé avec winnerUid:", winnerUid);
console.log("💰 Pot dans la salle:", room.pot);





const response =
await fetch(

"/api/game/payment",

{

method:"POST",

headers:{

"Content-Type":
"application/json"

},


body:JSON.stringify({

roomId,

winnerUid


})


}




);




const data =
await response.json();





if(!response.ok){

throw new Error(
data.error ||
"Erreur paiement"
);

}





console.log("✅ Paiement terminé:",data);





return data;




}





// =====================================
// DEMANDE REVANCHE
// =====================================

export async function requestRematch(

roomId:string,

uid:string

){



await update(

ref(
database,
`rooms/${roomId}`
),

{

rematch:{

requestedBy:uid,

status:"waiting",

time:Date.now()

}



}




);




}





// =====================================
// ACCEPTER REVANCHE
// =====================================

export async function acceptRematch(

roomId:string

){



const roomRef =
ref(
database,
`rooms/${roomId}`
);




const snap =
await get(roomRef);




if(!snap.exists()){

throw new Error(
"Salle introuvable"
);

}





const board =

Array.from(

{
length:10
},

()=>Array(10).fill("")

);




await update(

roomRef,

{

status:"starting",


countdownStart:
Date.now(),


rematch:null,




game:{

board,


turn:"X",


winner:null,


status:"starting",


turnStartedAt:
Date.now(),


paymentDone:false,


finishedAt:null


}




}




);




}





// =====================================
// REFUSER REVANCHE
// =====================================

export async function rejectRematch(

roomId:string

){



await update(

ref(
database,
`rooms/${roomId}`
),

{

rematch:null
}



);




}

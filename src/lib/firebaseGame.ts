import {
  ref,
  get,
  update,
  serverTimestamp
} from "firebase/database";


import {
  database
} from "@/lib/firebase";


import {
  makeMove,
  checkWinner
} from "./tttEngine";



export const TURN_TIME = 30;





// ==================================
// JOUER UN COUP
// ==================================

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



if(game.status === "finished"){

throw new Error(
"Partie terminée"
);

}



if(game.turn !== symbol){

throw new Error(
"Ce n'est pas votre tour"
);

}



if(game.board[row][col] !== ""){

throw new Error(
"Case occupée"
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

"game/board":newBoard

};






if(winner){



updates["game/status"] =
"finished";


updates["game/winner"] =
winner;


updates["game/finishedAt"] =
serverTimestamp();



}

else{



updates["game/turn"] =

symbol === "X"

?

"O"

:

"X";



updates["game/turnStartedAt"] =
serverTimestamp();



}






await update(

roomRef,

updates

);



}









// ==================================
// PAIEMENT GAGNANT
// ==================================

export async function finishGamePayment(

roomId:string,

winnerUid:string

){



const response =
await fetch(

"/api/game/payment",

{

method:"POST",

headers:{

"Content-Type":"application/json"

},


body:JSON.stringify({

roomId,

winnerUid

})


}

);





return await response.json();



}









// ==================================
// DEMANDER UNE REVANCHE
// ==================================

export async function requestRematch(

roomId:string,

uid:string,

name:string

){



await update(

ref(

database,

`rooms/${roomId}/rematch`

),

{


requestedBy:uid,


requesterName:name,


status:"waiting",


createdAt:serverTimestamp()



}

);



}









// ==================================
// ACCEPTER REVANCHE
// ==================================

export async function acceptRematch(

roomId:string,

uid:string

){



const response =

await fetch(

"/api/game/rematch",

{

method:"POST",


headers:{

"Content-Type":"application/json"

},


body:JSON.stringify({

roomId,

uid

})


}

);






return await response.json();



}









// ==================================
// REFUSER REVANCHE
// ==================================

export async function rejectRematch(

roomId:string,

uid:string

){



await update(

ref(

database,

`rooms/${roomId}/rematch`

),

{


[`rejected/${uid}`]:

true,


status:"rejected"



}

);



return {

success:true

};



}









// ==================================
// CONFIRMER NOUVELLE PARTIE
// ==================================

export async function confirmNewGame(

roomId:string

){



await update(

ref(

database,

`rooms/${roomId}`

),

{


status:"starting",


countdownStart:

serverTimestamp()



}

);



}
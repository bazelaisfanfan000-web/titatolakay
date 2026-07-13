import {
  ref,
  get,
  update,
  set
} from "firebase/database";

import {
  rtdb
} from "@/lib/firebase";



// =============================
// CONFIGURATION
// =============================

export const TURN_TIME = 30;





// =============================
// DEMARRER UN TOUR
// =============================

export async function startTurnTimer(

roomId:string

){

await update(

ref(
rtdb,
`rooms/${roomId}/game`
),

{

turnStartedAt:
Date.now(),

turnDuration:
TURN_TIME

}

);


}









// =============================
// VERIFIER SI LE TEMPS EST FINI
// =============================

export async function checkTurnTimeout(

roomId:string

){


const roomRef =
ref(
rtdb,
`rooms/${roomId}`
);



const snapshot =
await get(roomRef);



if(!snapshot.exists()){

return false;

}



const room =
snapshot.val();



const game =
room.game;



if(!game){

return false;

}



if(!game.turnStartedAt){

return false;

}





const elapsed =

Math.floor(

(Date.now() - game.turnStartedAt)

/1000

);





if(elapsed < TURN_TIME){

return false;

}





const nextTurn =

game.turn === "X"

?

"O"

:

"X";







await update(

roomRef,

{


"game/turn":

nextTurn,



"game/turnStartedAt":

Date.now()



}

);




return true;


}









// =============================
// CALCULER TEMPS RESTANT
// =============================

export function calculateTimeLeft(

turnStartedAt:number

){



if(!turnStartedAt){

return TURN_TIME;

}





const elapsed =

Math.floor(

(Date.now()-turnStartedAt)

/1000

);





const remaining =

TURN_TIME - elapsed;



return remaining > 0

?

remaining

:

0;


}
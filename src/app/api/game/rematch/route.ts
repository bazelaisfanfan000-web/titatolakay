import { NextResponse } from "next/server";

import { adminDB } from "@/lib/firebaseAdmin";



export async function POST(
request: Request
){

try{


const body =
await request.json();


const {
roomId,
uid
}=body;



if(
!roomId ||
!uid
){

return NextResponse.json(
{
error:"Informations manquantes"
},
{
status:400
}
);

}





const db =
adminDB();





const roomRef =
db.ref(
`rooms/${roomId}`
);


const roomSnap =
await roomRef.once("value");



if(!roomSnap.exists()){


return NextResponse.json(
{
error:"Partie introuvable"
},
{
status:404
}
);


}



const room =
roomSnap.val();





const players =
room.players || {};



if(!players[uid]){


return NextResponse.json(
{
error:"Joueur non présent dans la partie"
},
{
status:403
}
);


}






const rematch =
room.rematch || {};



const accepted =
rematch.accepted || {};





accepted[uid] = true;






const allPlayers =
Object.keys(players);





const allAccepted =
allPlayers.every(

(playerUid)=>

accepted[playerUid] === true

);







// Enregistrer acceptation

await db.ref(
`rooms/${roomId}/rematch/accepted`
)
.update({

[uid]:true

});







if(!allAccepted){



return NextResponse.json({

success:true,

waiting:true,

message:"En attente des autres joueurs"

});


}








// ==========================
// VERIFICATION SOLDES
// ==========================



const bet =
Number(room.bet || 0);



const updates:any = {};



for(
const playerUid of allPlayers
){


const userSnap =
await db.ref(
`users/${playerUid}`
)
.once("value");



if(!userSnap.exists()){


return NextResponse.json(
{
error:"Utilisateur introuvable"
},
{
status:404
}
);


}



const user =
userSnap.val();


const balance =
Number(user.balance || 0);





if(balance < bet){


return NextResponse.json(
{
error:
`Solde insuffisant pour ${playerUid}`
},
{
status:400
}
);


}





updates[
`users/${playerUid}/balance`
]
=
balance - bet;





updates[
`transactions/${playerUid}/${Date.now()}`
]
=
{

type:"rematch_bet",

amount:-bet,

gameId:roomId,

createdAt:Date.now()

};


}








// ==========================
// CREATION NOUVELLE ROOM
// ==========================



const newRoomRef =
db.ref("rooms")
.push();



const newRoomId =
newRoomRef.key;



if(!newRoomId){


throw new Error(
"Impossible de créer la partie"
);


}








const newPlayers:any = {};





allPlayers.forEach(

(playerUid,index)=>{


newPlayers[playerUid] = {


uid:playerUid,


name:
players[playerUid].name || "Joueur",



symbol:

index % 2 === 0

?

"X"

:

"O",



ready:true,


betPaid:true,


joinedAt:Date.now()


};


}

);








const newRoom = {


name:
room.name || "Revanche",


gameType:
room.gameType,


mode:
room.mode,


bet,


pot:
bet * allPlayers.length,


type:"private",


status:"starting",


maxPlayers:
room.maxPlayers,


playersCount:
allPlayers.length,


creatorId:
allPlayers[0],


players:newPlayers,



createdAt:Date.now(),



game:{


board:

Array.from(

{
length:10

},

()=>Array(10).fill("")

),


turn:"X",


winner:null,


status:"starting",


paymentDone:false,


reward:0


}



};







updates[
`rooms/${newRoomId}`
]
=
newRoom;



updates[
`rooms/${roomId}/rematch/status`
]
=
"created";






await db.ref().update(updates);








return NextResponse.json({

success:true,

roomId:newRoomId

});





}

catch(error:any){


console.error(
"REMATCH ERROR",
error
);



return NextResponse.json(

{
error:error.message
},

{
status:500
}

);


}


}
import {
  NextResponse
} from "next/server";

import {
  adminDB
} from "@/lib/firebaseAdmin";



export async function POST(
request: Request
){

try{


console.log("🏆 ROUTE WINNER APPELÉE");



const body =
await request.json();



const {
roomId,
winnerUid
}=body;



if(!roomId || !winnerUid){

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




console.log("ROOM:",room);




// empêcher double paiement

if(
room.game?.paymentDone === true
){

return NextResponse.json(
{
success:true,
message:"Paiement déjà effectué"
}
);

}




// vérifier fin partie

if(
room.game?.status !== "finished"
){

return NextResponse.json(
{
error:"Partie non terminée",
statusActuel:room.game?.status
},
{
status:400
}
);

}




// ===============================
// CALCUL DU POT
// ===============================


const pot =
Math.floor(
Number(room.pot || 0)
);



if(pot <= 0){

return NextResponse.json(
{
error:"Pot invalide"
},
{
status:400
}
);

}




// ===============================
// CALCUL DU GAIN
// ===============================


const reward =
Math.floor(
pot * 0.80
);



console.log(
"💰 GAIN:",
{
pot,
reward,
winnerUid
}
);




// ===============================
// VERIFIER UTILISATEUR
// ===============================


const userRef =
db.ref(
`users/${winnerUid}`
);



const userSnap =
await userRef.once("value");



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



const oldBalance =
Number(
user.balance || 0
);



const newBalance =
Math.floor(
oldBalance + reward
);




// ===============================
// MISE A JOUR
// ===============================


const transactionId =
Date.now();



const updates:any = {};



// crédit portefeuille

updates[
`users/${winnerUid}/balance`
]
=
newBalance;



// transaction

updates[
`transactions/${winnerUid}/${transactionId}`
]
=
{

type:"game_win",

amount:reward,

gameId:roomId,

userId:winnerUid,

createdAt:Date.now()

};



// partie payée

updates[
`rooms/${roomId}/game/paymentDone`
]
=
true;


updates[
`rooms/${roomId}/game/status`
]
=
"paid";


updates[
`rooms/${roomId}/game/reward`
]
=
reward;


updates[
`rooms/${roomId}/game/paidAt`
]
=
Date.now();




// appliquer

await db
.ref()
.update(updates);




console.log(
"✅ PAIEMENT RÉUSSI",
{
winnerUid,
reward,
ancienSolde:oldBalance,
nouveauSolde:newBalance
}
);




return NextResponse.json(
{

success:true,

winnerUid,

reward,

oldBalance,

newBalance

}
);



}
catch(error:any){


console.error(
"❌ ERREUR PAIEMENT",
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
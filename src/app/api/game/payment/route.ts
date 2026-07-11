import {
  NextResponse
} from "next/server";

import {
  adminDB
} from "@/lib/firebaseAdmin";





export async function POST(
request:Request
){


try{


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





const db = adminDB();

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





// éviter double paiement

if(
room.game?.paymentDone === true
){

return NextResponse.json({

success:true,

message:"Paiement déjà effectué"

});

}





if(
room.game?.status !== "finished"
){

return NextResponse.json(
{
error:"Partie non terminée"
},
{
status:400
}
);

}





// ===============================
// CALCUL DU POT TOTAL
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
// CALCUL GAIN (pot total x 0.80)
// ===============================


const reward =
Math.floor(
pot * 0.80
);




console.log("💰 PAIEMENT DETAILS:");
console.log("Pot total:", pot, "HTG");
console.log("Gain gagnant (pot x 0.80):", reward, "HTG");
console.log("Gagnant UID:", winnerUid);





// ===============================
// VERIFICATION JOUEUR
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
Math.floor(
Number(user.balance || 0)
);




const newBalance =
Math.floor(
oldBalance + reward
);




const transactionId =
Date.now().toString();





const updates:any = {};





// ===============================
// TRANSACTION ATOMIQUE SOLDE
// ===============================


updates[
`users/${winnerUid}/balance`
]
=
newBalance;





// ===============================
// HISTORIQUE TRANSACTION
// ===============================


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





// ===============================
// MARQUER PARTIE PAYEE
// ===============================


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





// ===============================
// EXECUTION ATOMIQUE
// ===============================


await db
.ref()
.update(updates);





console.log("✅ PAIEMENT EFFECTUE:",{
winnerUid,
reward,
newBalance,
pot
});





return NextResponse.json({

success:true,

reward,

newBalance,

pot

});



}
catch(error:any){


console.error(
"❌ PAYMENT ERROR",
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

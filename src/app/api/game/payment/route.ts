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
// CALCUL DU GAIN
// ===============================


const bet =
Number(room.bet || 0);



if(bet <= 0){

return NextResponse.json(
{
error:"Mise invalide"
},
{
status:400
}
);

}




// exemple:
// mise 100 HTG
// gagnant reçoit 180 HTG

const reward =
Math.floor(
bet * 1.8
);





const commission =
Math.floor(
(room.pot || 0) - reward
);







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
Number(
user.balance || 0
);



const newBalance =
oldBalance + reward;






const transactionId =
Date.now().toString();






const updates:any = {};




// ===============================
// AJOUT ARGENT AU JOUEUR
// ===============================


updates[
`users/${winnerUid}/balance`
]
=
newBalance;





// si tu utilises wallet

updates[
`wallets/${winnerUid}/balance`
]
=
newBalance;






// ===============================
// HISTORIQUE
// ===============================


updates[
`transactions/${winnerUid}/${transactionId}`
]
={

amount:reward,

type:"WIN",

gameId:roomId,

createdAt:Date.now()

};







// ===============================
// COMMISSION
// ===============================


updates[
`platform/commission/${transactionId}`
]
={

amount:commission,

gameId:roomId,

createdAt:Date.now()

};







// ===============================
// FIN PARTIE
// ===============================


updates[
`rooms/${roomId}/game/paymentDone`
]
=
true;



updates[
`rooms/${roomId}/game/reward`
]
=
reward;



updates[
`rooms/${roomId}/game/commission`
]
=
commission;



updates[
`rooms/${roomId}/game/paidAt`
]
=
Date.now();








await db
.ref()
.update(updates);








return NextResponse.json({

success:true,

reward,

commission,

newBalance

});





}
catch(error:any){


console.error(
"PAYMENT ERROR",
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
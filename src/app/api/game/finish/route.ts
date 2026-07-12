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


const body =
await request.json();


const {
roomId,
winnerUid
} = body;




if(
!roomId ||
!winnerUid
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





// ===============================
// RECUPERATION PARTIE
// ===============================


const roomRef =
db.ref(
`rooms/${roomId}`
);



const roomSnap =
await roomRef.once("value");



if(
!roomSnap.exists()
){

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






// ===============================
// PROTECTION DOUBLE PAIEMENT
// ===============================


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
// CALCUL
// ===============================


const pot =
Math.floor(
Number(room.pot || 0)
);



if(
pot <= 0
){

return NextResponse.json(
{
error:"Pot invalide"
},
{
status:400
}
);

}





const commission =
Math.floor(
pot * 0.10
);



const reward =
pot - commission;








// ===============================
// CREDIT GAGNANT
// ===============================


const balanceRef =
db.ref(
`users/${winnerUid}/balance`
);




const balanceSnap =
await balanceRef.once("value");



if(
!balanceSnap.exists()
){

return NextResponse.json(
{
error:"Utilisateur introuvable"
},
{
status:404
}
);

}






const transactionResult =

await balanceRef.transaction(

(current: unknown)=>{


const oldBalance =
Number(current || 0);



return oldBalance + reward;


}

);







if(
!transactionResult.committed
){

return NextResponse.json(
{
error:"Erreur crédit wallet"
},
{
status:500
}
);

}






const newBalance =
Number(
transactionResult.snapshot.val()
);



const oldBalance =
newBalance - reward;







// ===============================
// HISTORIQUE GAIN
// ===============================


const transactionId =
Date.now();




await db.ref(
`transactions/${winnerUid}/${transactionId}`
)
.set({

type:"game_win",

amount:reward,

pot,

commission,

gameId:roomId,

createdAt:Date.now()

});







// ===============================
// COMMISSION PLATFORME
// ===============================


await db.ref(
`platform/earnings/${transactionId}`
)
.set({

type:"game_commission",

amount:commission,

gameId:roomId,

createdAt:Date.now()

});







// ===============================
// MARQUER LA PARTIE PAYEE
// ===============================


await db.ref(
`rooms/${roomId}/game`
)
.update({

paymentDone:true,

reward,

commission,

status:"paid",

paidAt:Date.now()

});







return NextResponse.json({

success:true,

winnerUid,

pot,

commission,

reward,

oldBalance,

newBalance

});






}
catch(error:any){


console.error(
"Erreur paiement:",
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
import {
  NextResponse
} from "next/server";


import {
  adminDB,
  adminAuth
} from "@/lib/firebaseAdmin";


const COMMISSION_RATE = 0.10;


export async function POST(
request: Request
){


console.log("🎮 PAYMENT_START", Date.now());


try{


const body =
await request.json();


const {
roomId
}=body;





if(!roomId){


return NextResponse.json(
{
error:"RoomId manquant"
},
{
status:400
}
);

}





const authHeader =
request.headers.get("authorization");





if(!authHeader){


return NextResponse.json(
{
error:"Non connecté"
},
{
status:401
}
);

}




const token =
authHeader.replace("Bearer ", "");


await adminAuth.verifyIdToken(token);




const roomRef =
adminDB.ref(`rooms/${roomId}`);


const roomSnap =
await roomRef.get();





if(!roomSnap.exists()){


console.log("❌ PAYMENT_ERROR: Partie introuvable");


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





if(room.game?.status !== "finished"){


console.log("❌ PAYMENT_ERROR: Partie non terminée");


return NextResponse.json(
{
error:"Partie non terminée"
},
{
status:400
}
);

}




const paymentStatusRef =
adminDB.ref(`rooms/${roomId}/game/paymentStatus`);


const paymentStatusSnap =
await paymentStatusRef.get();





if(paymentStatusSnap.exists() && paymentStatusSnap.val() === "completed"){


console.log("❌ PAYMENT_ERROR: Déjà payé");


return NextResponse.json(
{
error:"Paiement déjà effectué"
},
{
status:400
}
);






}






await paymentStatusRef.set("processing");





const winnerSymbol =
room.game.winner;


let winnerUid = "";





Object.entries(room.players || {})
.forEach(([uid, player]:any)=>{


if(player.symbol === winnerSymbol){
winnerUid = uid;
}


});





if(!winnerUid){


console.log("❌ PAYMENT_ERROR: Gagnant introuvable");


await paymentStatusRef.set(null);


return NextResponse.json(
{
error:"Gagnant introuvable"
},
{
status:400
}
);

}




const pot =
Number(room.pot || 0);




if(pot <= 0){


console.log("❌ PAYMENT_ERROR: Pot invalide");


await paymentStatusRef.set(null);


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
Math.floor(pot * COMMISSION_RATE);


const reward =
pot - commission;




console.log("💰 CALCUL GAIN", {
pot,
commission,
reward,
winnerUid
});





let oldBalance = 0;
let newBalance = 0;




await adminDB.ref(`users/${winnerUid}/balance`)
.transaction((current:any)=>{


oldBalance =
Number(current || 0);


newBalance =
oldBalance + reward;




console.log("💳 TRANSACTION SOLDE", {
winnerUid,
oldBalance,
newBalance,
reward
});




return newBalance;


});





await adminDB.ref(`transactions/${winnerUid}`)
.push({
type:"game_reward",
amount:reward,
roomId,
oldBalance,
newBalance,
createdAt:Date.now()
});





await adminDB.ref("platform/earnings")
.push({
type:"commission",
amount:commission,
roomId,
createdAt:Date.now()
});





await paymentStatusRef.set("completed");





await roomRef.update({
"game/commission":commission,
"game/winnerReward":reward,
"game/paidAt":Date.now()
});





console.log("✅ PAYMENT_SUCCESS", {
roomId,
winnerUid,
reward,
commission
});




return NextResponse.json({
success:true,
winnerUid,
pot,
commission,
reward,
message:"Récompense envoyée avec succès"
});



}
catch(error:any){


console.error("❌ PAYMENT_ERROR", {
error:error.message,
stack:error.stack
});





return NextResponse.json(
{
error:error.message || "Erreur serveur"
},
{
status:500}
);


}


}

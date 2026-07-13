import {
  NextResponse
} from "next/server";


import {
  adminDB,
  adminAuth
} from "@/lib/firebaseAdmin";




export async function POST(
  request: Request
){


try{


const body =
await request.json();


const {
  roomId,
  winnerId
} = body;




if(!roomId || !winnerId){

return NextResponse.json(
{
error:"Données manquantes"
},
{
status:400
}
);

}




const authHeader =
request.headers.get(
"authorization"
);




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
authHeader.replace(
"Bearer ",
""
);




const user =
await adminAuth.verifyIdToken(
token);




const uid =
user.uid;




const roomRef =
adminDB.ref(
`rooms/${roomId}`
);




const snap =
await roomRef.get();




if(!snap.exists()){

return NextResponse.json(
{
error:"Partie inexistante"
},
{
status:404
}
);

}




const room =
snap.val();




if(room.game?.winner){

return NextResponse.json(
{
error:"Gain déjà distribué"
},
{
status:400
}
);

}




const playersCount =
room.playersCount || 2;




const pot =
Number(room.bet) * playersCount;




const commission =
Math.floor(pot * 0.10);




const reward =
pot - commission;




const winnerRef =
adminDB.ref(
`users/${winnerId}`
);




const winnerSnap =
await winnerRef.get();




if(!winnerSnap.exists()){

return NextResponse.json(
{
error:"Utilisateur introuvable"
},
{
status:404
}
);

}




const winner =
winnerSnap.val();




await winnerRef.update({

balance:
(winner.balance || 0) + reward




});




await roomRef.update({

"game/winner":winnerId,

"game/paymentStatus":"completed",

"game/finishedAt":Date.now()




});




await adminDB.ref("transactions").push({

userId:winnerId,

type:"GAME_WIN",

amount:reward,

fee:commission,

roomId,

createdAt:Date.now()




});




return NextResponse.json({

success:true,

reward,
commission

});




}
catch(error:any){


console.error(
"WINNER ERROR",
error
);




return NextResponse.json(
{
error:error.message ||
"Erreur serveur"
},
{
status:500
}
);




}




}

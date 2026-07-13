import {
  NextResponse
} from "next/server";


import {
  adminDB,
  adminAuth
} from "@/lib/firebaseAdmin";


import {
  checkUserBalance,
  deductBet
} from "@/lib/firebaseEconomyAdmin";


import {
  push,
  ref
} from "firebase/database";



export async function POST(
request: Request
){


try{


const body =
await request.json();



const {

name,

bet,

mode,

gameType

} = body;





if(!bet || Number(bet)<=0){


return NextResponse.json(
{
error:"Mise invalide"
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
error:"Utilisateur non connecté"
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





const decoded =
await adminAuth.verifyIdToken(
token
);



const uid =
decoded.uid;







const balance =
await checkUserBalance(
uid
);






if(balance < Number(bet)){


return NextResponse.json(
{
error:
`Solde insuffisant (${balance} HTG)`
},
{
status:400
}
);


}






await deductBet(
uid,
Number(bet),
"create-room"
);







const maxPlayers =
mode==="2v2"
?
4
:
2;const roomRef =
adminDB.ref(
"rooms"
);



const newRoomRef =
roomRef.push();



const roomId =
newRoomRef.key;






if(!roomId){


throw new Error(
"Impossible de créer la salle"
);


}








const playerName =

decoded.name ||

decoded.email ||

"Joueur";









const roomData = {


id:roomId,


name:
name ||
"Partie TiTaTo",



bet:
Number(bet),



mode,



gameType:
gameType ||
"titato",



creatorId:
uid,



status:
"waiting",



playersCount:
1,



maxPlayers,



pot:
Number(bet),



createdAt:
Date.now(),





players:{


[uid]:{


uid,


name:playerName,


symbol:"X",


ready:true,


betPaid:true,


joinedAt:
Date.now()


}


}





};









await newRoomRef.set(
roomData
);










return NextResponse.json({

success:true,


roomId,


status:"waiting"


});







}
catch(error:any){



console.error(
"CREATE ROOM ERROR",
error
);




return NextResponse.json(
{

error:
error.message ||
"Erreur serveur"

},
{
status:500
}
);



}


}
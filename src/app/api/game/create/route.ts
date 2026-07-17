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





const amount =
Number(bet);





if(
!amount ||
amount <= 0
){


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





console.log(
"👤 CREATE ROOM UID:",
uid
);







// =============================
// VERIFICATION SOLDE
// =============================


const balance =
await checkUserBalance(
uid
);



console.log(
"💰 CREATE ROOM BALANCE:",
balance
);






if(
balance < amount
){


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








// =============================
// DEBIT
// =============================


const debit =
await deductBet(

uid,

amount,

"create-room"

);





console.log(
  "BET DEBIT",
  debit
);







// =============================
// CREATION SALLE
// =============================


const maxPlayers =

mode === "2v2"

?

4

:

2;







const roomRef =
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

name?.trim()

?

name.trim()

:

"Partie TiTaTo",




bet:amount,



mode:

mode || "1v1",




gameType:

gameType || "titato",




creatorId:uid,




status:"waiting",




playersCount:1,




maxPlayers,




pot:amount,




createdAt:Date.now(),






players:{


[uid]:{


uid,


name:playerName,


symbol:"X",


ready:true,


betPaid:true,


joinedAt:Date.now()


}


}




};








await newRoomRef.set(
roomData
);






console.log(
"✅ ROOM CREATED",
{

roomId,

uid,

amount,

before:balance,

after:
balance - amount

}

);







return NextResponse.json(

{

success:true,

roomId,

status:"waiting"

}

);





}
catch(error:any){


console.error(

"❌ CREATE ROOM ERROR",

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
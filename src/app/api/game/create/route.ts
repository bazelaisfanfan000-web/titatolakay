import {
  NextResponse
} from "next/server";


export const runtime = "nodejs";

export const dynamic = "force-dynamic";


import {
  adminDB
} from "@/lib/firebaseAdmin";


import {
  adminAuth
} from "@/lib/firebaseAuthAdmin";


import {
  checkUserBalance,
  deductBet
} from "@/lib/firebaseEconomyAdmin";




export async function POST(
  request: Request
) {

try {



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





if(!amount || amount <= 0){


return NextResponse.json(

{

success:false,

error:"Mise invalide"

},

{

status:400

}

);


}





// ===============================
// AUTH TOKEN
// ===============================


const authHeader =
request.headers.get(
"authorization"
);



if(!authHeader){


return NextResponse.json(

{

success:false,

error:"Token manquant"

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





if(!token){


return NextResponse.json(

{

success:false,

error:"Token vide"

},

{

status:401

}

);


}





let decoded;



try {


decoded =
await adminAuth.verifyIdToken(
token
);



}

catch(err:any){


console.error(
"FIREBASE AUTH ERROR",
err
);



return NextResponse.json(

{

success:false,

error:"Token Firebase invalide"

},

{

status:401

}

);


}




const uid =
decoded.uid;



console.log(
"CREATE ROOM",
{
uid,
amount
}
);






// ===============================
// CHECK BALANCE
// ===============================


const balance =
await checkUserBalance(
uid
);





if(balance < amount){


return NextResponse.json(

{

success:false,

error:
`Solde insuffisant (${balance} HTG)`

},

{

status:400

}

);


}





// ===============================
// DEBIT MISE
// ===============================


await deductBet(

uid,

amount,

"create-room"

);






// ===============================
// ROOM
// ===============================


const maxPlayers =

mode === "2v2"

?

4

:

2;






const newRoomRef =
adminDB
.ref("rooms")
.push();




const roomId =
newRoomRef.key;




if(!roomId){


throw new Error(
"Room ID impossible"
);


}





const playerName =

decoded.name ||

decoded.email ||

"Joueur";






await newRoomRef.set({



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



});







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

"CREATE ROOM CRASH:",

error

);





return NextResponse.json(

{


success:false,


error:

error?.message ||

"Erreur serveur création partie"


},

{

status:500

}

);



}


}
import {
  NextResponse
} from "next/server";


export const runtime = "nodejs";

export const dynamic = "force-dynamic";


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
roomId
}=body;




if(!roomId){


return NextResponse.json(
{
error:"Salle manquante"
},
{
status:400
}
);

}





// ===============================
// AUTH
// ===============================


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





const decoded =
await adminAuth.verifyIdToken(
token
);


const uid =
decoded.uid;






// ===============================
// ROOM
// ===============================


const roomRef =
adminDB.ref(
`rooms/${roomId}`
);




const snap =
await roomRef.get();





if(!snap.exists()){


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
snap.val();







// Vérifier créateur

if(
room.creatorId !== uid
){


return NextResponse.json(
{
error:"Vous n'êtes pas le créateur"
},
{
status:403
}
);

}





// Seulement partie attente

if(
room.status !== "waiting"
){


return NextResponse.json(
{
error:"Impossible de quitter une partie en cours"
},
{
status:400
}
);

}







// ===============================
// REMBOURSEMENT
// ===============================


const bet =
Number(room.bet || 0);




if(bet > 0){


const userRef =
adminDB.ref(
`users/${uid}/balance`
);




const balanceSnap =
await userRef.get();




const oldBalance =
Number(
balanceSnap.val() || 0
);




const newBalance =
oldBalance + bet;




await userRef.set(
newBalance
);






await adminDB
.ref(
`transactions/${uid}`
)
.push({

type:"room_refund",

amount:bet,

oldBalance,

newBalance,

roomId,

createdAt:Date.now()

});



}







// ===============================
// SUPPRIMER ROOM
// ===============================


await roomRef.remove();






return NextResponse.json({

success:true,

message:
"Partie supprimée et mise remboursée"

});




}
catch(error:any){


console.error(
"LEAVE ROOM ERROR",
error
);




return NextResponse.json(
{
error:
error?.message ||
"Erreur serveur"
},
{
status:500
}
);


}


}
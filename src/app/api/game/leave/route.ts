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
// SUPPRIMER ROOM (SANS REMBOURSEMENT)
// ===============================
// NOTE: Avec le nouveau système, aucun débit lors de la création
// Le débit se fait seulement quand le 2e joueur rejoint
// Donc si le créateur quitte avant que quelqu'un rejoigne,
// il n'a pas été débité, donc pas besoin de remboursement


await roomRef.remove();






return NextResponse.json({

success:true,

message:
"Partie supprimée"

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
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




const authHeader =
request.headers.get(
"authorization"
);




if(!authHeader){


return NextResponse.json(
{
error:"Non connecte"
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




// Verifier que l'utilisateur est le createur
if(
room.creatorId !== uid
){


return NextResponse.json(
{
error:"Vous n'etes pas le createur"
},
{
status:403
}
);

}




// Ne supprimer que les parties en attente
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




// Rembourser le createur si une mise a ete deduite
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




// Rembourser
await userRef.set(
oldBalance + bet
);




// Enregistrer la transaction de remboursement
await adminDB.ref(
`transactions/${uid}`
).push({
type:"room_refund",
amount:bet,
roomId,
createdAt:Date.now()
});

}




// Supprimer la partie
await roomRef.remove();




return NextResponse.json({
success:true,
message:"Partie supprimee et mise remboursee"
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
error.message ||
"Erreur serveur"
},
{
status:500
}
);


}


}

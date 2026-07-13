import { NextResponse } from "next/server";

import { adminDB } from "@/lib/firebaseAdmin";




export async function POST(
request: Request
){


try{


const body =
await request.json();


const {
roomId,
uid
}=body;



if(
!roomId ||
!uid
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
adminDB;



const roomRef =
db.ref(
`rooms/${roomId}`
);


const roomSnap =
await roomRef.get();




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




const players =
room.players || {};


if(!players[uid]){


return NextResponse.json(
{
error:"Joueur non présent dans la partie"
},
{
status:403
}
);


}



// Supprimer la demande de revanche

await db.ref(
`rooms/${roomId}/rematch`
)
.remove();




return NextResponse.json({
success:true,
message:"Revanche refusée"
});




}
catch(error:any){


console.error(
"REJECT REMATCH ERROR",
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

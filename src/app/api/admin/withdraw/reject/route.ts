import {
  NextResponse
} from "next/server";


import {
  adminDB,
  adminAuth
} from "@/lib/firebaseAdmin";


export const runtime="nodejs";


export async function POST(
  request:Request
){

try{


const {
token,
uid,
withdrawId
}=await request.json();



if(!token || !uid || !withdrawId){

return NextResponse.json(
{
error:"Données manquantes"
},
{
status:400
}
);

}



const decoded =
await adminAuth.verifyIdToken(token);



const adminSnap =
await adminDB
.ref(
`admins/${decoded.uid}`
)
.get();



if(!adminSnap.exists()){

return NextResponse.json(
{
error:"Accès refusé"
},
{
status:403
}
);

}




const withdrawRef =
adminDB.ref(
`withdrawals/${uid}/${withdrawId}`
);



const snap =
await withdrawRef.get();



if(!snap.exists()){

return NextResponse.json(
{
error:"Retrait introuvable"
},
{
status:404
}
);

}



const withdraw =
snap.val();



if(withdraw.status !== "pending"){

return NextResponse.json(
{
error:"Déjà traité"
},
{
status:400
}
);

}




// remboursement wallet

await adminDB
.ref(
`users/${uid}/balance`
)
.transaction(
(current)=>{

return Number(current || 0)
+
Number(withdraw.amount);

}
);




// changer statut

await withdrawRef.update({

status:"rejected",

rejectedAt:Date.now()

});





await adminDB
.ref(
`transactions/${uid}`
)
.push({

type:"withdraw_rejected_refund",

amount:withdraw.amount,

withdrawId,

createdAt:Date.now()

});




return NextResponse.json({

success:true,

message:
"Retrait refusé et remboursé"

});




}
catch(error:any){

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
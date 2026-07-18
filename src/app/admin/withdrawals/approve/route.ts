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
await adminAuth.verifyIdToken(
token
);





const admin =
await adminDB
.ref(
`admins/${decoded.uid}`
)
.get();




if(!admin.exists()){


return NextResponse.json(
{
error:"Non autorisé"
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






if(
withdraw.status !== "pending"
){


return NextResponse.json(
{
error:"Retrait déjà traité"
},
{
status:400
}
);

}








await withdrawRef.update({

status:"approved",

approvedAt:
Date.now(),

note:
"En attente de paiement Tchotchom"


});







await adminDB
.ref(
`transactions/${uid}`
)
.push({

type:
"withdraw_approved",

amount:
withdraw.amount,

withdrawId,

createdAt:
Date.now()


});






return NextResponse.json({

success:true,

message:
"Retrait accepté"

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
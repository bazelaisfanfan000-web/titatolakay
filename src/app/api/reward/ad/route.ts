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
  addBalance
} from "@/lib/firebaseEconomyAdmin";




// ===============================
// ADMIN ADD REWARD
// ===============================

export async function POST(
  request: Request
){

try{


const body =
await request.json();



const token =
body?.token;


const uid =
body?.uid;


const amount =
Number(body?.amount);





if(!token){

return NextResponse.json(
{
success:false,
error:"Token manquant"
},
{
status:400
}
);

}



if(!uid){

return NextResponse.json(
{
success:false,
error:"UID utilisateur manquant"
},
{
status:400
}
);

}



if(!amount || amount <= 0){

return NextResponse.json(
{
success:false,
error:"Montant invalide"
},
{
status:400
}
);

}





if(!adminAuth){

throw new Error(
"Firebase Auth non disponible"
);

}



if(!adminDB){

throw new Error(
"Firebase Database non disponible"
);

}





const decoded =
await adminAuth.verifyIdToken(
token
);



const adminUid =
decoded.uid;






const adminSnap =
await adminDB
.ref(
`admins/${adminUid}`
)
.get();





if(!adminSnap.exists()){


return NextResponse.json(
{
success:false,
error:"Accès administrateur refusé"
},
{
status:403
}
);


}






const result =
await addBalance(

uid,

amount,

"admin_reward"

);






return NextResponse.json(
{

success:true,

message:"Récompense ajoutée",

reward:amount,

oldBalance:
result.oldBalance,

newBalance:
result.newBalance

}
);





}
catch(error:any){


console.error(
"[ADMIN REWARD ERROR]",
error
);



return NextResponse.json(
{

success:false,

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
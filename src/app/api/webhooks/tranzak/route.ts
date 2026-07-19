import {
NextResponse
} from "next/server";


import crypto from "crypto";


import {
adminDB
} from "@/lib/firebaseAdmin";



export const runtime="nodejs";




function verifySignature(
payload:string,
signature:string
){


const secret =
process.env.TRANZAK_WEBHOOK_SECRET;



if(!secret){

return false;

}




const expected =
crypto
.createHmac(
"sha256",
secret
)
.update(payload)
.digest("hex");




if(
expected.length !== signature.length
){

return false;

}




return crypto.timingSafeEqual(

Buffer.from(expected),

Buffer.from(signature)

);


}





export async function POST(
request:Request
){


try{



const rawBody =
await request.text();




const signature =
request.headers.get(
"x-tranzak-signature"
);




if(!signature){

return NextResponse.json(
{
error:"Signature manquante"
},
{
status:401
}
);

}




if(
!verifySignature(
rawBody,
signature
)
){

return NextResponse.json(
{
error:"Signature invalide"
},
{
status:401
}
);

}





const data =
JSON.parse(rawBody);





console.log(
"TRANSAK EVENT",
data
);






const transactionId =
data.transaction_id ||
data.orderId;






if(!transactionId){

return NextResponse.json(
{
error:"Transaction id manquant"
},
{
status:400
}
);

}







const snapshot =
await adminDB
.ref(
`transactions/${transactionId}`
)
.get();





if(!snapshot.exists()){


return NextResponse.json(

{
error:"Transaction inconnue"
},

{
status:404
}

);


}




const tx =
snapshot.val();





if(
tx.status==="completed"
){

return NextResponse.json({

success:true,

message:"Déjà traité"

});

}





const uid =
tx.uid;


const amount =
Number(tx.amount);







// Ajouter au wallet

await adminDB
.ref(
`users/${uid}/balance`
)
.transaction(

(current)=>{

return Number(current || 0)
+
amount;

}

);







// Marquer paiement terminé

await adminDB
.ref(
`transactions/${transactionId}`
)
.update({

status:"completed",

completedAt:
Date.now()

});







return NextResponse.json({

success:true

});





}
catch(error:any){



console.error(
"TRANSAK WEBHOOK ERROR",
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
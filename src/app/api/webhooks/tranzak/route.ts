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





if(
data.event !== "payment.completed"
){

return NextResponse.json({

success:true,

message:
"Event ignoré"

});

}







const transactionId =
data.transaction_id;





const transactionSnap =
await adminDB
.ref("transactions")
.orderByChild(
"transactionId"
)
.equalTo(
transactionId
)
.get();






if(!transactionSnap.exists()){


return NextResponse.json(
{
error:"Transaction inconnue"
},
{
status:404
}
);

}







let uid="";
let amount=0;
let alreadyPaid=false;





transactionSnap.forEach(
(userSnap)=>{


userSnap.forEach(
(txSnap)=>{


const tx =
txSnap.val();



if(
tx.type==="deposit_pending"
){

uid =
userSnap.key!;


amount =
Number(tx.amount);



if(tx.status==="completed"){

alreadyPaid=true;

}


}



});


});







if(alreadyPaid){

return NextResponse.json({

success:true,

message:
"Déjà traité"

});

}







if(!uid || !amount){

return NextResponse.json(
{
error:"Données invalides"
},
{
status:400
}
);

}






// ajouter argent wallet

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






// modifier transaction

await adminDB
.ref(
`transactions/${uid}`
)
.push({

type:
"deposit_completed",

amount,

transactionId,

createdAt:
Date.now()

});







await adminDB
.ref(
`transactions/${uid}`
)
.orderByChild(
"transactionId"
)
.equalTo(
transactionId
)
.get()
.then(
async(snapshot)=>{

snapshot.forEach(
(item)=>{


item.ref.update({

status:
"completed"

});


});


}
);







return NextResponse.json({

success:true

});





}
catch(error:any){


console.error(
"Tranzak webhook error",
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
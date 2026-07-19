import { NextResponse } from "next/server";

import {
  adminAuth,
  adminDB
} from "@/lib/firebaseAdmin";


export const runtime = "nodejs";


export async function POST(
req: Request
) {

try {


const body = await req.json();


const {
amount
}=body;



const header =
req.headers.get("authorization");



if(!header){

return NextResponse.json(
{
error:"Authorization manquante"
},
{
status:401
}
);

}



const token =
header.replace("Bearer ","");



const decoded =
await adminAuth.verifyIdToken(token);



const uid =
decoded.uid;



const value =
Number(amount);



if(!value || value < 50){

return NextResponse.json(
{
error:"Minimum dépôt 50 HTG"
},
{
status:400
}
);

}



const apiKey =
process.env.TRANZAK_API_KEY;



if(!apiKey){

return NextResponse.json(
{
error:"TRANZAK_API_KEY manquante"
},
{
status:500
}
);

}




/*
1 - Créer une réservation wallet Transak
*/


const reservationResponse =
await fetch(

"https://api.transak.com/api/v2/wallet-reservations",

{

method:"POST",

headers:{

"Content-Type":"application/json",

"api-secret":apiKey

},


body:JSON.stringify({

walletAddress:
process.env.TRANZAK_WALLET_ADDRESS,

cryptoCurrencyCode:"USDT"

})


}

);



const reservationData =
await reservationResponse.json();



if(!reservationResponse.ok){

console.log(
"TRANZAK RESERVATION ERROR",
reservationData
);


return NextResponse.json(
{
error:"Erreur réservation wallet",
details:reservationData
},
{
status:500
}
);

}




const walletReservationId =
reservationData.response?.walletReservationId
||
reservationData.walletReservationId;





if(!walletReservationId){

return NextResponse.json(
{
error:"Wallet reservation Id absent",
details:reservationData
},
{
status:500
}
);

}





/*
2 - Enregistrer transaction Firebase
*/


const transactionId =
crypto.randomUUID();



await adminDB
.ref(
`transactions/${transactionId}`
)
.set({

transactionId,

uid,

type:"deposit",

amount:value,

status:"pending",

walletReservationId,

createdAt:Date.now()

});







/*
3 - Créer ordre Transak
*/


const response =
await fetch(

"https://api.transak.com/api/v2/orders",

{

method:"POST",

headers:{


"Content-Type":"application/json",


"api-secret":apiKey


},


body:JSON.stringify({

fiatAmount:value,


fiatCurrency:"USD",


cryptoCurrencyCode:"USDT",


walletReservationId,


redirectURL:
`${process.env.NEXT_PUBLIC_APP_URL}/wallet`


})


}

);





const data =
await response.json();





if(!response.ok){


console.log(
"TRANZAK ERROR",
data
);


return NextResponse.json(

{
error:"Erreur Transak",
details:data
},

{
status:500
}

);

}





return NextResponse.json({

success:true,

paymentUrl:
data.response?.url
||
data.url,

transactionId

});





}
catch(error:any){


console.error(
"TRANSAK CREATE ERROR",
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
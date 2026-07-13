import {
  NextResponse
} from "next/server";

import {
  adminDB
} from "@/lib/firebaseAdmin";

import {
  createMonCashPayment
} from "@/lib/moncash";



export async function POST(
request: Request
){

try{


const body =
await request.json();



const {
uid,
amount,
username
}=body;



if(
!uid ||
!amount
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



const depositAmount =
Number(amount);



if(
isNaN(depositAmount) ||
depositAmount <= 0
){

return NextResponse.json(
{
error:"Montant invalide"
},
{
status:400
}
);

}



// minimum dépôt

if(
depositAmount < 10
){

return NextResponse.json(
{
error:"Dépôt minimum 10 HTG"
},
{
status:400
}
);

}





// Référence unique MonCash

const reference =

"deposit_" +

Date.now() +

"_" +

uid.substring(0,8);







// enregistrer le dépôt en attente

await adminDB.ref(`pendingDeposits/${reference}`).set({

uid,

username:
username || "Joueur",

amount:
depositAmount,

reference,

status:"pending",

createdAt:Date.now()

});







// création paiement MonCashConnect

const payment =

await createMonCashPayment(

depositAmount,

reference,

username || "Joueur"

);








return NextResponse.json(

{

success:true,

paymentUrl:
payment.paymentUrl,

reference

}

);







}catch(error:any){



console.error(
"DEPOSIT ERROR :",
error
);




return NextResponse.json(

{

error:
error.message ||
"Erreur création dépôt"

},

{
status:500
}

);



}


}
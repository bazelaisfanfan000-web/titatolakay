import {
  NextResponse
} from "next/server";

import {
  adminDB
} from "@/lib/firebaseAdmin";

import {
  createMonCashPayout
} from "@/lib/moncash";





export async function POST(
request:Request
){

try{


const body =
await request.json();



const {
uid,
amount,
moncashNumber
}=body;




if(
!uid ||
!amount ||
!moncashNumber
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






const withdrawAmount =
Number(amount);



if(
withdrawAmount <=0
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





// récupérer wallet joueur

const walletSnap =
await adminDB.ref(`wallets/${uid}`).get();



if(!walletSnap.exists()){

return NextResponse.json(

{
error:"Wallet introuvable"
},

{
status:404
}

);

}





const wallet =
walletSnap.val();



const balance =
Number(wallet.balance || 0);





if(
balance < withdrawAmount
){

return NextResponse.json(

{
error:"Solde insuffisant"
},

{
status:400
}

);

}





// référence retrait

const reference =

"withdraw_" +

Date.now() +

"_" +

uid.substring(0,8);







// bloquer argent

await adminDB.ref(`wallets/${uid}`).update({

balance:
balance - withdrawAmount

});







// enregistrer demande

await adminDB.ref(`withdrawals/${reference}`).set({

uid,

amount:
withdrawAmount,

moncashNumber,

reference,

status:"pending",

createdAt:Date.now()

});








// appel MonCash payout

const payout =

await createMonCashPayout(

withdrawAmount,

moncashNumber,

reference

);








return NextResponse.json(

{

success:true,

reference,

payout

}

);






}catch(error:any){



console.error(
error
);



return NextResponse.json(

{
error:
error.message ||
"Erreur retrait"
},

{
status:500
}

);



}


}
import {
  NextResponse
} from "next/server";


import {
  adminDB
} from "@/lib/firebaseAdmin";





export async function POST(
request:Request
){


try{


const body =
await request.json();



const {
orderId,
transactionId
}=body;





if(
!orderId ||
!transactionId
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






const depositRef =

adminDB.ref(
`deposits/${orderId}`
);





const snapshot =
await depositRef.get();





if(
!snapshot.exists()
){

return NextResponse.json(

{
error:"Dépôt introuvable"
},

{
status:404
}

);

}





const deposit =
snapshot.val();






if(
deposit.status === "completed"
){

return NextResponse.json({

success:true,

message:"Déjà confirmé"

});

}







const uid =
deposit.uid;



const amount =
Number(deposit.amount);






// créditer solde utilisateur de manière atomique
const balanceRef = adminDB.ref(`users/${uid}/balance`);

let oldBal = 0;
let newBal = 0;

await balanceRef.transaction((current:any)=>{
  oldBal = Number(current || 0);
  newBal = oldBal + amount;
  return newBal;
});

// enregistrer transaction
await adminDB.ref(`transactions/${uid}`).push({
  type: "deposit",
  amount,
  provider: "MonCash",
  reference: orderId,
  status: "completed",
  createdAt: Date.now(),
  oldBalance: oldBal,
  newBalance: newBal
});







await depositRef.update({

status:"completed",

transactionId,

completedAt:Date.now()

});







await adminDB.ref(

`notifications/${uid}`

).push({

title:"Dépôt confirmé",

message:

`Votre portefeuille a reçu ${amount} HTG`,

type:"deposit",

read:false,

createdAt:Date.now()

});







return NextResponse.json({

success:true

});



}
catch(error:any){


console.error(
"CONFIRM ERROR",
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
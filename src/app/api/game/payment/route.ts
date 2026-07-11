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
roomId,
winnerUid
}=body;




if(
!roomId ||
!winnerUid
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





const roomRef =
adminDB().ref(
`rooms/${roomId}`
);




const roomSnap =
await roomRef.once("value");





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





// Protection double paiement

if(
room.game?.paymentDone === true
){


return NextResponse.json({

message:"Paiement déjà effectué"


});


}





// Vérifier que la partie est terminée

if(
room.game?.status !== "finished"
){


return NextResponse.json(

{
error:"La partie n'est pas terminée"
},

{
status:400
}


);


}





// Mise

const bet =

Number(
room.bet || 0
);




// Gain x1.80

const reward =

Math.floor(
bet * 1.80
);




// Commission plateforme

const commission =

Math.floor(

Number(room.pot || 0)

-
reward

);





// Vérifier joueur gagnant

const userRef =

adminDB().ref(
`users/${winnerUid}`
);




const userSnap =
await userRef.once("value");






if(!userSnap.exists()){


return NextResponse.json(

{
error:"Utilisateur introuvable"
},

{
status:404
}


);


}





const user =
userSnap.val();





const oldBalance =

Number(
user.balance || 0
);




const newBalance =

Math.floor(
oldBalance + reward
);




const transactionId =

Date.now()
.toString();





const updates:any = {};





// Nouveau solde gagnant

updates[

`users/${winnerUid}/balance`

]
=
newBalance;





// Marquer paiement effectué

updates[

`rooms/${roomId}/game/paymentDone`

]
=
true;





updates[

`rooms/${roomId}/game/reward`

]
=
reward;





updates[

`rooms/${roomId}/game/commission`

]
=
commission;





updates[

`rooms/${roomId}/game/paidAt`

]
=
Date.now();





// Transaction gagnant

updates[

`transactions/${transactionId}`

]
={


uid:winnerUid,


amount:reward,


type:"WIN",


gameId:roomId,


createdAt:Date.now()


};





// Transaction commission plateforme

updates[

`platform/commission/${transactionId}`

]
={


amount:commission,


gameId:roomId,


createdAt:Date.now()


};





await adminDB()
.ref()
.update(updates);





return NextResponse.json({

success:true,

reward,

commission

});



}
catch(error:any){


console.error(error);




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

import {
  NextResponse
} from "next/server";


import {
  adminDB
} from "@/lib/firebaseAdmin";


import {
  checkAdmin
} from "@/lib/checkAdmin";

import {
  sendNotification
} from "@/lib/notifications";




export async function POST(
request:Request
){


try{


const body =
await request.json();


const {
adminUid,
amount,
message
}=body;




if(
!adminUid ||
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




// Vérifier que c'est un admin

await checkAdmin(
adminUid);




const usersSnap =

await adminDB

.ref("users")

.once("value");




const users =
usersSnap.val() || {};




const updates:any = {};




const notificationPromises:any[] = [];




Object.entries(users)

.forEach(
([uid,user]:any)=>{


const oldBalance =

Number(
user.balance || 0
);




updates[

`users/${uid}/balance`

]

=

Math.floor(
oldBalance + Number(amount)
);




notificationPromises.push(
sendNotification(
uid,
{
title:"📢 Message Titato",
message:message || "Bienvenue dans la nouvelle version",
type:"system",
amount:Number(amount)
}
)
);





});




await adminDB

.ref()

.update(
updates
);




await Promise.all(notificationPromises);




return NextResponse.json({

success:true,


players:

Object.keys(users).length,


total:

Object.keys(users).length
*
Number(amount)




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

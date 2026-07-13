import {
  NextResponse
} from "next/server";


import {
  adminDB
} from "@/lib/firebaseAdmin";


import {
  checkAdmin
} from "@/lib/checkAdmin";




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
adminUid
);






const usersSnap =

await adminDB

.ref("users")

.once("value");




const users =
usersSnap.val() || {};




const updates:any = {};




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






const notificationId =

Date.now()
+
Math.random();






updates[

`notifications/${uid}/${notificationId}`

]
=


{


title:"🎁 Récompense Domino Lakay",


message:

message ||

`Vous avez reçu ${amount} HTG`,


read:false,

createdAt:Date.now()



};




}

);






await adminDB

.ref()

.update(
updates
);




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

import {
  rtdb
} from "@/lib/firebase";


import {
 ref,
 set,
 update,
 push
} from "firebase/database";




export async function banUser(

uid:string,

reason:string,

days:number

){



const expire =

Date.now()

+

days *

24 *

60 *

60 *

1000;





// enregistrer bannissement

await set(

ref(
rtdb,
`bans/${uid}`
),

{

reason,

duration:days,

until:expire,

createdAt:Date.now()

}

);






// bloquer compte

await update(

ref(
rtdb,
`users/${uid}`
),

{

banned:true

}

);







// envoyer notification

const notif =

push(

ref(
rtdb,
`notifications/${uid}`
)

);



await set(

notif,

{

title:"🚫 Compte suspendu",

message:
`Votre compte est suspendu : ${reason}`,

read:false,

date:Date.now()

}

);



}
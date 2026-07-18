import {
  ref,
  push,
  set,
  get
} from "firebase/database";

import {
  database
} from "@/lib/firebase";




// ENVOYER DEMANDE AMI

export async function sendFriendRequest(

fromUid:string,

toUid:string

){


const requestRef = push(

ref(
database,
"friendRequests"
)

);



await set(

requestRef,

{

from: fromUid,

to: toUid,

status:"pending",

createdAt: Date.now()

}

);



return true;


}







// VERIFIER STATUT AMI

export async function checkFriendStatus(

userUid:string,

friendUid:string

){



const friendRef = ref(

database,

`friends/${userUid}/${friendUid}`

);



const snapshot =
await get(friendRef);



if(snapshot.exists()){


return "friend";


}






const requestsRef = ref(

database,

"friendRequests"

);



const requestSnapshot =
await get(requestsRef);



const data =
requestSnapshot.val();



if(data){


const request =
Object.values(data).find(

(item:any)=>

item.from === userUid &&

item.to === friendUid &&

item.status === "pending"

);



if(request){

return "pending";

}


}




return "none";


}
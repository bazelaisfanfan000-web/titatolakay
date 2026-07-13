import {
  adminDB
} from "./firebaseAdmin";





export async function checkAdmin(

uid:string

){



const snapshot =

await adminDB

.ref(

`users/${uid}`

)

.get();







const user =

snapshot.val();







if(

!user ||

user.role !== "admin"

){


throw new Error(

"Accès refusé : administrateur uniquement"

);


}






return true;



}
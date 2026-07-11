import {
  ref,
  get,
  update
} from "firebase/database";


import {
  database
} from "@/lib/firebase";





export async function addPlayerWin(
uid:string
){


const userRef =
ref(
database,
`users/${uid}`
);



const snapshot =
await get(userRef);



if(!snapshot.exists())
return;



const user =
snapshot.val();





await update(

userRef,

{

wins:
Number(user.wins || 0) + 1,


games:
Number(user.games || 0) + 1


}

);



}







export async function addPlayerLose(
uid:string
){


const userRef =
ref(
database,
`users/${uid}`
);



const snapshot =
await get(userRef);



if(!snapshot.exists())
return;



const user =
snapshot.val();





await update(

userRef,

{

games:
Number(user.games || 0) + 1


}

);



}
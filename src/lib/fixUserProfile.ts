import {
  ref,
  get,
  update
} from "firebase/database";


import {
  database,
  auth
} from "./firebase";





export async function fixUserProfile(
  uid:string
){


try{


const userRef =

ref(

database,

`users/${uid}`

);



const snapshot =

await get(userRef);



if(!snapshot.exists()){

return "Joueur";

}




const data =
snapshot.val();





if(data.username){

return data.username;

}





let username =

data.name ||

data.displayName;







// Cherche aussi dans Firebase Auth

const currentUser =
auth.currentUser;



if(
!username &&
currentUser &&
currentUser.uid===uid &&
currentUser.displayName
){


username =
currentUser.displayName;


}








if(!username){


username =

"Joueur_" +

uid.substring(0,5);


}







await update(

userRef,

{

username

}

);





return username;



}

catch(error){


console.log(

"FIX PROFILE ERROR",

error

);



return "Joueur";

}



}
import {
  ref,
  get,
  update
} from "firebase/database";

import {
  database
} from "./firebase";




export async function getPlayerName(
  uid:string
){

try{


if(!uid){

return "Joueur";

}



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





// Si username existe déjà

if(data.username){

return data.username;

}





// Chercher d'autres noms possibles

const name =

data.name ||

data.displayName ||

data.email?.split("@")[0];







const finalName =

name ||

"Joueur_" + uid.substring(0,5);








// Sauvegarde sans toucher au solde

await update(

userRef,

{

username:finalName

}

);





return finalName;



}

catch(error){


console.log(

"GET PLAYER NAME ERROR",

error

);


return "Joueur";


}



}
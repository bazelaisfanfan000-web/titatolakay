import {
  ref,
  get,
  set
} from "firebase/database";

import {
  database
} from "@/lib/firebase";




// AJOUTER VICTOIRE

export async function addPlayerWin(
uid?:string
){

if(!uid)
return {
success:false
};



const statsRef = ref(
database,
`users/${uid}/stats`
);



const snapshot =
await get(statsRef);



const stats =
snapshot.val() || {};



await set(
statsRef,
{

wins:
(stats.wins || 0) + 1,


loses:
stats.loses || 0,


games:
(stats.games || 0) + 1

}

);



return {
success:true
};


}






// AJOUTER DEFAITE

export async function addPlayerLose(
uid?:string
){

if(!uid)
return {
success:false
};



const statsRef = ref(
database,
`users/${uid}/stats`
);



const snapshot =
await get(statsRef);



const stats =
snapshot.val() || {};



await set(
statsRef,
{


wins:
stats.wins || 0,


loses:
(stats.loses || 0) + 1,


games:
(stats.games || 0) + 1


}

);



return {
success:true
};


}
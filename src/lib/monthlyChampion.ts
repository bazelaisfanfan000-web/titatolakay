import {
  adminDB
} from "@/lib/firebaseAdmin";



// Ajouter des points après une partie
export async function addMonthlyPoints(
  uid:string,
  points:number
){

const ref =
adminDB.ref(
`users/${uid}`
);


const snap =
await ref.get();


const user =
snap.val() || {};


const currentPoints =
Number(user.monthlyPoints || 0);



await ref.update({

monthlyPoints:
currentPoints + points

});


}





// Trouver le champion du mois

export async function getMonthlyChampion(){

const usersRef =
adminDB.ref(
"users"
);


const snap =
await usersRef.get();



const users =
snap.val() || {};



let champion:any = null;



Object.entries(users)
.forEach(
([uid,user]:any)=>{


const points =
Number(user.monthlyPoints || 0);



if(
!champion ||
points > champion.points
){


champion = {

uid,

username:
user.username || "Joueur",

points

};


}


}
);



return champion;


}







// Sauvegarder le champion

export async function saveMonthlyChampion(){

const champion =
await getMonthlyChampion();



if(!champion){

return null;

}



const date =
new Date();


const month =
`${date.getFullYear()}-${String(
date.getMonth()+1
).padStart(2,"0")}`;



await adminDB
.ref(
`champions/${month}`
)
.set({

uid:
champion.uid,

username:
champion.username,

points:
champion.points,

reward:
1000,

createdAt:
Date.now()

});



return champion;

}
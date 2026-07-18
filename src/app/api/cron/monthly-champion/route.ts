import {
  NextResponse
} from "next/server";


import {
  adminDB
} from "@/lib/firebaseAdmin";



export const runtime = "nodejs";

export const dynamic = "force-dynamic";





export async function GET(
request:Request
){


try{


// ===============================
// MOIS ACTUEL
// ===============================


const now =
new Date();


const currentMonth =
`${now.getFullYear()}-${String(
now.getMonth()+1
).padStart(2,"0")}`;







// ===============================
// EVITER DOUBLE EXECUTION
// ===============================


const settingRef =
adminDB.ref(
"settings/lastChampionMonth"
);



const settingSnap =
await settingRef.get();



const lastMonth =
settingSnap.val();





if(
lastMonth === currentMonth
){


return NextResponse.json({

success:false,

message:"Champion déjà calculé pour ce mois"

});


}







// ===============================
// CHERCHER LE CHAMPION
// ===============================


const usersSnap =
await adminDB
.ref("users")
.get();



const users =
usersSnap.val() || {};




let champion:any = null;





Object.entries(users)
.forEach(
([uid,user]:any)=>{


const points =
Number(
user.monthlyPoints || 0
);



if(
!champion ||
points > champion.points
){


champion={

uid,

username:
user.username || "Joueur",

points

};


}


}
);








if(!champion){


return NextResponse.json({

success:false,

message:"Aucun joueur trouvé"

});


}







// ===============================
// SAUVER ANCIEN MOIS
// ===============================


const previousDate =
new Date();


previousDate.setMonth(
previousDate.getMonth()-1
);



const previousMonth =
`${previousDate.getFullYear()}-${String(
previousDate.getMonth()+1
).padStart(2,"0")}`;







await adminDB
.ref(
`champions/${previousMonth}` 
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








// ===============================
// RESET POINTS
// ===============================


const updates:any={};



Object.keys(users)
.forEach(
(uid)=>{


updates[
`users/${uid}/monthlyPoints` 
]=0;


}
);





await adminDB
.ref()
.update(updates);








// ===============================
// MARQUER EXECUTION
// ===============================


await settingRef.set(
currentMonth
);







return NextResponse.json({

success:true,

champion

});






}
catch(error:any){


console.error(
"MONTHLY CHAMPION ERROR",
error
);



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

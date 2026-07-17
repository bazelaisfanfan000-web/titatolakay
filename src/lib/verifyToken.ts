import {
 adminDB
} from "@/lib/firebaseAdmin";


export async function verifyToken(
token:string
){

if(!token){

throw new Error(
"Token manquant"
);

}


// récupération utilisateur depuis Firebase
const snap =
await adminDB
.ref(
`sessions/${token}`
)
.get();


if(!snap.exists()){

throw new Error(
"Token invalide"
);

}


return {

uid:
snap.val().uid

};

}
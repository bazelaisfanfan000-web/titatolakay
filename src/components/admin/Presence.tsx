"use client";


import {
  useEffect
} from "react";


import {
  auth,
  database
} from "@/lib/firebase";


import {
  onAuthStateChanged
} from "firebase/auth";


import {
  ref,
  update,
  onDisconnect,
  serverTimestamp
} from "firebase/database";





export default function Presence(){



useEffect(()=>{


let interval:any;



const unsubscribe =

onAuthStateChanged(

auth,

(user)=>{


if(!user)
return;





const userRef =

ref(
database,
`users/${user.uid}`
);







const goOnline = async()=>{


await update(

userRef,

{

online:true,

lastSeen:serverTimestamp()

}

);


};









const goOffline = async()=>{


await update(

userRef,

{

online:false,

lastSeen:serverTimestamp()

}

);


};









// connexion immédiate


goOnline();







// quand utilisateur quitte


onDisconnect(userRef)

.update({

online:false,

lastSeen:serverTimestamp()

});








// actualisation chaque minute


interval = setInterval(()=>{


goOnline();


},60000);







// retour quand onglet devient actif


const handleVisibility = ()=>{


if(
document.visibilityState === "visible"
){

goOnline();

}


};




document.addEventListener(
"visibilitychange",
handleVisibility
);








return()=>{


document.removeEventListener(

"visibilitychange",

handleVisibility

);


};


}


);







return()=>{


unsubscribe();


if(interval){

clearInterval(interval);

}


};



},[]);






return null;


}
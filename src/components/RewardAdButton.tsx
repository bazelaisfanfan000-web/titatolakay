"use client";

import {
  useState
} from "react";

import {
  auth
} from "@/lib/firebase";

import {
  onAuthStateChanged
} from "firebase/auth";


const MONETAG_DIRECT_LINK =
"https://omg10.com/4/11336319";


const MIN_TIME = 15;



export default function RewardAdButton(){


const [loading,setLoading] =
useState(false);


const [seconds,setSeconds] =
useState(0);





function getUser(){


return new Promise<any>((resolve)=>{


const unsubscribe =

onAuthStateChanged(

auth,

(user)=>{


unsubscribe();

resolve(user);


}

);


});


}







async function watchAd(){


if(loading)
return;




const user =

await getUser();





if(!user){


alert(
"Connecte-toi pour regarder une publicité"
);


return;


}





setLoading(true);



let hiddenTime:number|null = null;



function visibilityHandler(){


if(
document.visibilityState === "hidden"
){


hiddenTime =
Date.now();


}





if(
document.visibilityState === "visible"
&&
hiddenTime
){



const timeAway =

(Date.now()-hiddenTime)/1000;



if(timeAway < MIN_TIME){


alert(
"❌ Publicité non terminée"
);



setLoading(false);


}



}


}






document.addEventListener(

"visibilitychange",

visibilityHandler

);






// Ouvre publicité Monetag

window.open(

MONETAG_DIRECT_LINK,

"_blank"

);






// Compteur

for(
let i = MIN_TIME;
i >= 0;
i--
){


setSeconds(i);



await new Promise(

resolve=>

setTimeout(resolve,1000)

);


}






document.removeEventListener(

"visibilitychange",

visibilityHandler

);







if(hiddenTime === null){


alert(
"❌ Publicité non ouverte"
);


setLoading(false);

return;


}







const elapsed =

(Date.now()-hiddenTime)/1000;




if(elapsed < MIN_TIME){


setLoading(false);

return;


}







const token =

await user.getIdToken(true);







const response =

await fetch(

"/api/reward/ad",

{

method:"POST",

headers:{

"Content-Type":

"application/json"

},

body:JSON.stringify({

token

})

}

);







const data =

await response.json();






if(data.success){



alert(

`🎉 +5 HTG ajouté\n💰 Solde: ${data.balance} HTG`

);


}

else{


alert(

data.error ||

"Erreur récompense"

);


}






setLoading(false);

setSeconds(0);



}







return(


<button


onClick={watchAd}


disabled={loading}



className="

w-auto

mx-auto

bg-blue-600

hover:bg-blue-700

text-white

font-bold

text-xs

py-2

px-3

rounded-xl

shadow-md

transition

disabled:opacity-50

"


>



{

loading

?

`⏳ Pub ${seconds}s`

:

"🎬 Pub +5 HTG"

}



</button>



);


}
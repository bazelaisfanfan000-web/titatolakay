"use client";


import {
  useEffect,
  useState
} from "react";


import {
  useParams,
  useRouter
} from "next/navigation";


import {
  ref,
  onValue
} from "firebase/database";


import {
  database
} from "@/lib/firebase";





export default function CountdownPage(){


const params =
useParams();


const router =
useRouter();



const id =
params.id as string;



const [count,setCount] =
useState(5);



const [ready,setReady] =
useState(false);









useEffect(()=>{


if(!id)
return;



const roomRef =
ref(
database,
`rooms/${id}`
);





const unsubscribe =
onValue(
roomRef,
(snapshot)=>{


const room =
snapshot.val();



if(!room)
return;





let startTime =
room.countdownAt;



if(!startTime){

startTime =
Date.now();

}





const interval =
setInterval(()=>{



const now =
Date.now();



const diff =
5 -
Math.floor(
(now - startTime)
/1000
);





if(diff <= 0){


clearInterval(interval);


setCount(0);


setReady(true);


return;


}



setCount(diff);



},200);





return()=>clearInterval(interval);



}

);



return()=>unsubscribe();



},[
id
]);








useEffect(()=>{


if(!ready)
return;



const timer =
setTimeout(()=>{


router.replace(
`/game/${id}`
);



},800);





return()=>clearTimeout(timer);



},[
ready,
id,
router
]);









return(


<main

className="
min-h-screen
bg-gradient-to-br
from-black
via-blue-950
to-black
text-white
flex
items-center
justify-center
"

>



<div

className="
text-center
"

>



<div

className="
text-6xl
mb-6
animate-bounce
"

>

🎮

</div>






<h1

className="
text-3xl
font-black
"

>

TiTaTo

</h1>






<p

className="
text-gray-300
mt-3
"

>

La partie commence dans

</p>







<div

className="
text-9xl
font-black
text-cyan-400
mt-6
drop-shadow-lg
"

>

{count}

</div>







{

count === 0 &&


<p

className="
mt-6
text-green-400
font-black
animate-pulse
"

>

🚀 Début de la partie !

</p>


}



</div>



</main>


);


}
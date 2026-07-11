"use client";


import { useEffect, useState } from "react";



type Props = {

  turnStartedAt:number;

  isMyTurn:boolean;

  onTimeout:()=>void;

};



export default function GameTimer({

  turnStartedAt,

  isMyTurn,

  onTimeout

}:Props){



const [time,setTime]=useState(30);

const [called,setCalled]=useState(false);




useEffect(()=>{


if(!turnStartedAt)
return;



const timer=setInterval(()=>{



const now=Date.now();



const elapsed =
Math.floor(
(now-turnStartedAt)/1000
);



const remaining =
30-elapsed;



setTime(
remaining > 0
?
remaining
:
0
);





if(

remaining <=0 &&

!called &&

isMyTurn

){


setCalled(true);


onTimeout();


}





},500);




return()=>clearInterval(timer);



},[
turnStartedAt,
isMyTurn,
called,
onTimeout
]);






return (

<div

className={`
text-center
font-bold
text-xl
mt-3

${

time <=5

?

"animate-pulse text-red-500"

:

"text-white"

}

`}

>


{

isMyTurn

?

<>⏱️ Ton tour : {time}s</>

:

<>⏳ Tour adversaire : {time}s</>

}



{

time <=5 && time>0 &&

<div

className="
text-red-600
text-3xl
font-black
animate-bounce
mt-2
"

>

⚠️ {time}

</div>

}



</div>

);


}
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


const [time,setTime] =
useState(30);



useEffect(()=>{


if(!turnStartedAt)
return;



const interval =
setInterval(()=>{


const elapsed =
Math.floor(
(Date.now()-turnStartedAt)
/1000
);



const remaining =
Math.max(
30-elapsed,
0
);



setTime(
remaining
);



if(remaining===0){

onTimeout();

}



},1000);



return ()=>clearInterval(interval);



},[
turnStartedAt,
onTimeout
]);




return (

<div className="
bg-black/40
border
border-blue-400/30
rounded-xl
px-4
py-2
mt-3
">

⏱️ {time}s

{

isMyTurn &&

<span className="ml-2 text-green-400">
Votre tour
</span>

}

</div>

);


}
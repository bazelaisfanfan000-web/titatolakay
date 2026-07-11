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
  onValue,
  update
} from "firebase/database";


import {
  database
} from "@/lib/firebase";





export default function CountdownPage(){



const params = useParams();

const router = useRouter();


const id = params.id as string;



const [count,setCount] = useState(5);
const [roomData,setRoomData] = useState<any>(null);
const [hasRedirected,setHasRedirected] = useState(false);





useEffect(()=>{


if(!id)
return;



const roomRef = ref(
database,
`rooms/${id}`
);





const unsubscribe = onValue(

roomRef,

(snapshot)=>{


const room = snapshot.val();

if(room){
setRoomData(room);
}


}

);





return()=>unsubscribe();



},[id]);





useEffect(()=>{


if(!roomData || !roomData.countdownStart || hasRedirected)
return;



const timer = setInterval(()=>{


const elapsed =
Date.now()
-
roomData.countdownStart;




const remaining =
5 -
Math.floor(
elapsed / 1000
);





if(remaining > 0){
setCount(remaining);
}
else{
clearInterval(timer);
setCount(0);




update(
ref(database,`rooms/${id}`),
{


status:"playing",


"game/status":"playing",


"game/turnStartedAt":
Date.now()



}
)

.then(()=>{


setHasRedirected(true);
router.push(
`/game/${id}`
);


});
}



},200);





return()=>clearInterval(timer);



},[roomData,id,router,hasRedirected]);








return(



<main className="
min-h-screen
bg-black
text-white
flex
items-center
justify-center
p-4
">






<div className="
text-center
">






<h1 className="
text-4xl
font-bold
mb-12
">

🎮 Ti Ta To Arena

</h1>








<p className="
text-2xl
font-bold
mb-8
">

🚀 La partie va commencer...

</p>








<div className="
text-[120px]
font-black
text-red-500
animate-pulse
">



{


count===0

?

"GO!"

:

count



}



</div>








<p className="
mt-8
text-xl
text-gray-400
">

Prépare-toi à jouer 🎮

</p>








</div>





</main>



);


}

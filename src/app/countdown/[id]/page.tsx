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
  motion
} from "framer-motion";

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

const [
count,
setCount
] = useState(10);



useEffect(()=>{

if(!id)
return;

const roomRef =
ref(
database,
`rooms/${id}`
);

let interval:any;

const unsubscribe =

onValue(

roomRef,

(snapshot)=>{

const room =
snapshot.val();

if(!room)
return;

const start =
room.countdownStart;

if(!start)
return;

if(interval)
clearInterval(interval);

interval = setInterval(()=>{

const elapsed =

Math.floor(

(Date.now() - start) / 1000

);

const number =

10 - elapsed;

if(number > 0){

setCount(number);

}

else{

clearInterval(interval);

update(

roomRef,

{

status:"playing",

"game/status":"playing",

"game/turnStartedAt":
Date.now()

}

);

router.push(
`/game/${id}`
);

}

},200);

}

);

return()=>{

unsubscribe();

if(interval)
clearInterval(interval);

};

},[
id,
router
]);



return(

<main

className="
min-h-screen
relative
overflow-hidden
bg-gradient-to-br
from-[#020617]
via-[#07152f]
to-black
flex
items-center
justify-center
px-4
"

>

<motion.div

animate={{
x:[0,40,0],
y:[0,20,0]
}}

transition={{
duration:6,
repeat:Infinity
}}

className="
absolute
w-64
h-64
bg-blue-500/20
rounded-full
blur-3xl
top-0
left-[-80px]
"

/>


<motion.div

animate={{
x:[0,-40,0],
y:[0,-20,0]
}}

transition={{
duration:7,
repeat:Infinity
}}

className="
absolute
w-64
h-64
bg-cyan-500/20
rounded-full
blur-3xl
bottom-0
right-[-80px]
"

/>


<div

className="
relative
z-10
w-full
max-w-md
backdrop-blur-2xl
bg-white/10
border
border-white/20
rounded-3xl
p-10
text-center
shadow-2xl
"

>

<h1

className="
text-2xl
font-black
text-white
mb-8
"

>

🎮 La partie commence dans

</h1>


<motion.div

key={count}

initial={{
scale:0.8,
opacity:0
}}

animate={{
scale:1,
opacity:1
}}

transition={{
duration:0.25
}}

className="
text-[120px]
font-black
text-cyan-400
leading-none
"

>

{count}

</motion.div>


<p

className="
mt-8
text-lg
text-gray-300
"

>

⏳ Prépare-toi...

</p>


<div

className="
mt-6
w-full
h-2
bg-white/10
rounded-full
overflow-hidden
"

>

<div

className="
h-full
bg-gradient-to-r
from-cyan-400
to-blue-500
transition-all
duration-1000
"

style={{
width:`${count * 10}%`
}}

/>

</div>


<p

className="
mt-5
text-xs
text-cyan-300
font-bold
"

>

🧪 Ti Ta To Beta

</p>

</div>

</main>

);

}
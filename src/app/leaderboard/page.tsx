"use client";


import {
  useEffect,
  useState
} from "react";


import {
  motion
} from "framer-motion";


import {
  ref,
  onValue
} from "firebase/database";


import {
  database
} from "@/lib/firebase";


import BackButton from "@/components/BackButton";





export default function LeaderboardPage(){


const [players,setPlayers] =
useState<any[]>([]);


const [loading,setLoading] =
useState(true);






useEffect(()=>{


const usersRef =
ref(
database,
"users"
);





const unsubscribe =

onValue(

usersRef,

(snapshot)=>{


const data =
snapshot.val() || {};





const list =

Object.entries(data)

.map(([uid,user]:any)=>(

{

uid,

username:
user.username || "Joueur",


wins:
user.stats?.wins || 0,


loses:
user.stats?.loses || 0,


games:
user.stats?.games || 0


}

))



.filter(

(player:any)=>

player.games > 0

);






const sorted =

list.sort(

(a:any,b:any)=>

Number(b.wins)

-

Number(a.wins)

);






setPlayers(

sorted.slice(0,50)

);



setLoading(false);



}


);






return ()=>unsubscribe();



},[]);









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

text-white

px-4

py-10

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

w-56

h-56

bg-blue-500/20

rounded-full

blur-3xl

top-0

left-[-60px]

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

w-56

h-56

bg-purple-500/20

rounded-full

blur-3xl

bottom-10

right-[-60px]

"

/>









<div


className="

relative

z-10

max-w-sm

mx-auto

"

>



<BackButton />







<motion.h1


animate={{

y:[0,-5,0]

}}


transition={{

duration:3,

repeat:Infinity

}}


className="

text-xl

font-black

text-center

mb-3

bg-gradient-to-r

from-blue-400

to-cyan-300

bg-clip-text

text-transparent

"

>


🏆 Classement Ti Ta To


</motion.h1>






<p

className="

text-center

text-xs

text-gray-400

mb-6

"

>


Les meilleurs joueurs par victoires 🎮


</p>









{

loading &&


<p

className="

text-center

text-gray-400

mt-10

"

>

Chargement...

</p>


}










<div

className="

flex

flex-col

gap-4

"

>


{


players.map((player,index)=>(



<motion.div


key={player.uid}



initial={{

opacity:0,

y:30

}}



animate={{

opacity:1,

y:0

}}



transition={{

delay:index*0.05

}}



whileHover={{

scale:1.02,

y:-3

}}



className="

bg-white/10

backdrop-blur-2xl

border

border-white/20

rounded-3xl

p-5

shadow-xl

flex

items-center

justify-between

"

>








<div

className="

flex

items-center

gap-3

"

>





<div

className="

w-12

h-12

rounded-2xl

bg-blue-500/20

border

border-blue-400/30

flex

items-center

justify-center

text-xl

font-black

"

>


{

index===0

?

"🥇"

:

index===1

?

"🥈"

:

index===2

?

"🥉"

:

`#${index+1}`

}


</div>








<div>


<h2

className="

font-bold

text-sm

"

>

{player.username}

</h2>




<p

className="

text-xs

text-gray-400

mt-1

"

>


🎮 {player.games} parties


</p>




<p

className="

text-xs

text-gray-400

"

>


❌ {player.loses} défaites


</p>



</div>







</div>










<div

className="

text-right

"

>



<p

className="

text-yellow-400

font-black

"

>

🏆 {player.wins}

</p>



<p

className="

text-[10px]

text-gray-400

"

>

victoires

</p>



</div>









</motion.div>



))


}



</div>










<motion.p


animate={{

opacity:[0.4,1,0.4]

}}



transition={{

duration:3,

repeat:Infinity

}}



className="

text-center

text-[10px]

text-cyan-300

font-bold

mt-8

"

>


🧪 Ti Ta To - Version bêta


</motion.p>







</div>



</main>


);


}
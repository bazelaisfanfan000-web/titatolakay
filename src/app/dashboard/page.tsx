"use client";

import {
  useEffect,
  useState
} from "react";

import {
  useRouter
} from "next/navigation";

import {
  auth,
  database
} from "@/lib/firebase";

import {
  onAuthStateChanged
} from "firebase/auth";

import {
  ref,
  onValue
} from "firebase/database";

import {
  useBalance
} from "@/hooks/useBalance";

import {
  motion
} from "framer-motion";



export default function Dashboard(){


const router =
useRouter();



const {
 balance,
 loading:balanceLoading
}=useBalance();




const [
 username,
 setUsername
]=useState("Joueur");



const [
 notificationCount,
 setNotificationCount
]=useState(0);





const [
 stats,
 setStats
]=useState({

wins:0,

games:0

});





const winRate = stats.games > 0

?

Math.round(
(stats.wins / stats.games) * 100
)

:

0;





useEffect(()=>{


const unsubscribeAuth =

onAuthStateChanged(

auth,

(user)=>{


if(!user){

router.push("/login");

return;

}





const userRef =

ref(

database,

`users/${user.uid}`

);






const unsubscribeUser =

onValue(

userRef,

(snapshot)=>{


const data =
snapshot.val();



if(data){


setUsername(

data.username || "Joueur"

);



setStats({

wins:Number(data.wins || 0),

games:Number(data.games || 0)

});


}


}

);






const notifRef =

ref(

database,

`notifications/${user.uid}`

);






const unsubscribeNotif =

onValue(

notifRef,

(snapshot)=>{


const data =
snapshot.val();



let unreadNotifications = 0;



if(data){


unreadNotifications =

Object.values(data)

.filter(

(item:any)=>

item.read === false

)

.length;


}





const friendRequestRef =

ref(

database,

"friendRequests"

);






onValue(

friendRequestRef,

(friendSnapshot)=>{


const requests =
friendSnapshot.val();



let friendRequestsCount = 0;





if(requests){


friendRequestsCount =

Object.values(requests)

.filter(

(item:any)=>

item.to === user.uid &&

item.status === "pending"

)

.length;


}





setNotificationCount(

unreadNotifications +

friendRequestsCount

);



}

);



}

);





return()=>{


unsubscribeUser();

unsubscribeNotif();


};



}

);



return()=>unsubscribeAuth();



},[router]);



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
pb-40
flex
justify-center
"

>


<motion.div

animate={{

x:[0,30,0],

y:[0,20,0]

}}

transition={{

duration:6,

repeat:Infinity

}}

className="
absolute
w-52
h-52
bg-blue-500/20
rounded-full
blur-3xl
top-10
left-[-40px]
"

/>




<motion.div

animate={{

x:[0,-30,0],

y:[0,-20,0]

}}

transition={{

duration:7,

repeat:Infinity

}}

className="
absolute
w-52
h-52
bg-purple-500/20
rounded-full
blur-3xl
bottom-20
right-[-40px]
"

/>



<section

className="
relative
z-10
w-full
max-w-xs
pt-16
"

>


<header

className="
fixed
top-0
left-0
right-0
bg-white/10
backdrop-blur-2xl
border-b
border-white/20
z-50
"

>


<div

className="
max-w-xs
mx-auto
px-4
py-3
flex
justify-between
items-center
"

>


<motion.h1

animate={{

y:[0,-4,0]

}}

transition={{

duration:3,

repeat:Infinity

}}

className="
text-sm
font-black
bg-gradient-to-r
from-blue-400
to-cyan-300
bg-clip-text
text-transparent
"

>

⭕ TI TA TO

</motion.h1>

<button

onClick={()=>router.push("/wallet")}

className="
bg-gradient-to-b
from-green-400
to-green-700
border
border-green-300/50
rounded-xl
px-4
py-2
shadow-[0_5px_0_#166534]
active:translate-y-1
active:shadow-[0_2px_0_#166534]
transition-all
duration-150
"

>

<span

className="
text-white
font-black
text-xs
"

>

💰 {balanceLoading ? "..." : Math.floor(balance)} HTG

</span>


</button>



</div>


</header>





<div className="mt-4">


<p

className="
text-[11px]
text-gray-400
"

>

Salut 👋

</p>



<h2

className="
text-base
font-bold
mt-1
"

>

{username}

</h2>





<div

className="
mt-4
bg-white/10
backdrop-blur-2xl
border
border-white/20
rounded-3xl
p-4
grid
grid-cols-3
items-center
text-center
"

>


<div>

<p className="text-yellow-300 font-bold text-sm">

🏆 {stats.wins}

</p>

<p className="text-[10px] text-gray-400">

Victoire

</p>

</div>





<div>

<p className="text-green-400 font-bold text-sm">

📈 {winRate}%

</p>

<p className="text-[10px] text-gray-400">

Taux gagner

</p>

</div>





<div>

<p className="text-cyan-300 font-bold text-sm">

🎮 {stats.games}

</p>

<p className="text-[10px] text-gray-400">

Parties

</p>

</div>


</div>






<div

className="
flex
flex-col
gap-4
mt-5
"

>


<ActionButton

variant="glass"

big

onClick={()=>router.push("/create-room")}

>

🎮 Créer une partie

</ActionButton>





<ActionButton

variant="glass"

big

onClick={()=>router.push("/join-room")}

>

🚀 Rejoindre une partie

</ActionButton>





<div className="mt-12">


<motion.div

animate={{

scale:[1,1.08,1]

}}

transition={{

duration:2,

repeat:Infinity

}}

className="relative"

>


<ActionButton

variant="blue"

onClick={()=>router.push("/more")}

>

➕ Plus

</ActionButton>





<motion.div

animate={{

y:[0,8,0]

}}

transition={{

duration:1.2,

repeat:Infinity

}}

className="
absolute
left-1/2
-translate-x-1/2
top-full
mt-2
text-2xl
"

>

👆

</motion.div>


</motion.div>


</div>



</div>

</div>

</section>






<nav

className="
fixed
bottom-3
left-1/2
-translate-x-1/2
w-[92%]
max-w-xs
h-14
bg-white/10
backdrop-blur-2xl
border
border-white/20
rounded-2xl
flex
justify-around
items-center
z-50
"

>


<NavItem
icon="🏠"
text="Accueil"
onClick={()=>router.push("/dashboard")}
/>


<NavItem
icon="💼"
text="Portefeuille"
onClick={()=>router.push("/wallet")}
/>



<div

onClick={()=>router.push("/notifications")}

className="
relative
text-center
text-[10px]
cursor-pointer
"

>

🔔


{

notificationCount>0 &&

<span

className="
absolute
right-[-8px]
top-[-8px]
bg-red-500
text-white
rounded-full
text-[9px]
px-1
font-bold
"

>

{

notificationCount>9

?

"9+"

:

notificationCount

}

</span>

}


<br/>

Notification

</div>




<NavItem

icon="⚙️"

text="Paramètre"

onClick={()=>router.push("/settings")}

/>


</nav>



</main>


);


}






function ActionButton({

children,

onClick,

variant="blue",

big=false


}:{

children:React.ReactNode;

onClick:()=>void;

variant?:"blue"|"glass";

big?:boolean;

}){


return(


<motion.button

whileHover={{

scale:1.03,

y:-3

}}


whileTap={{

scale:.95

}}


onClick={onClick}


className={

variant==="blue"

?

`

w-full

${big ? "py-5 text-base rounded-2xl" : "py-3 text-sm rounded-xl"}

font-bold

bg-gradient-to-b

from-blue-400

to-blue-700

border

border-blue-300/40

shadow-[0_6px_0_#123a8a]

`

:

`

w-full

${big ? "py-5 text-base rounded-2xl" : "py-3 text-sm rounded-xl"}

font-bold

bg-white/20

backdrop-blur-xl

border

border-white/30

shadow-[0_6px_0_rgba(255,255,255,0.15)]

`

}


>

{children}

</motion.button>


);


}






function NavItem({

icon,

text,

onClick


}:{

icon:string;

text:string;

onClick:()=>void;

}){


return(


<button

onClick={onClick}

className="

text-[10px]

text-gray-200

"

>

{icon}

<br/>

{text}


</button>


);


}
"use client";

import {
  useEffect,
  useState
} from "react";

import {
  useRouter
} from "next/navigation";

import {
  ref,
  onValue,
  remove,
  set
} from "firebase/database";

import {
  auth,
  database
} from "@/lib/firebase";

import {
  onAuthStateChanged
} from "firebase/auth";


export default function NotificationsPage(){


const router = useRouter();


const [userId,setUserId] = useState("");

const [notifications,setNotifications] = useState<any[]>([]);




// ==========================
// AUTH
// ==========================

useEffect(()=>{


const unsubscribeAuth = onAuthStateChanged(

auth,

(user)=>{


if(user){

setUserId(user.uid);

}


}

);


return ()=>unsubscribeAuth();


},[]);






// ==========================
// NOTIFICATIONS TEMPS RÉEL
// ==========================

useEffect(()=>{


if(!userId)
return;



const notifRef = ref(

database,

`notifications/${userId}`

);



const unsubscribe = onValue(

notifRef,

(snapshot)=>{


const data = snapshot.val();



if(!data){

setNotifications([]);

return;

}



const list = Object.entries(data)

.map(([id,value]:any)=>({

id,

...value

}))


.sort(

(a,b)=>

(b.createdAt || 0)

-

(a.createdAt || 0)

);



setNotifications(list);


}


);



return ()=>unsubscribe();


},[userId]);








// ==========================
// LIRE NOTIFICATION
// ==========================

async function markRead(item:any){


if(item.read)
return;



await set(

ref(

database,

`notifications/${userId}/${item.id}/read`

),

true

);


}







// ==========================
// OUVRIR MESSAGE
// ==========================

function openMessage(item:any){


markRead(item);


router.push("/friends");


}






// ==========================
// ACCEPTER AMI
// ==========================

async function acceptFriend(notification:any){


if(!notification.from)
return;


const friendId = notification.from;



await set(

ref(

database,

`friends/${userId}/${friendId}`

),

true

);



await set(

ref(

database,

`friends/${friendId}/${userId}`

),

true

);



await remove(

ref(

database,

`notifications/${userId}/${notification.id}`

)

);


}







// ==========================
// REFUSER AMI
// ==========================

async function refuseFriend(notification:any){


await remove(

ref(

database,

`notifications/${userId}/${notification.id}`

)

);


}return(

<main

className="

min-h-screen

bg-gradient-to-br

from-black

via-blue-950

to-black

text-white

p-4

"

>


<div

className="

w-full

max-w-md

mx-auto

"

>



<div

className="

flex

justify-start

mb-6

"

>


<button

onClick={()=>router.back()}

className="

bg-white/10

border

border-white/20

px-5

py-3

rounded-2xl

font-bold

active:scale-95

transition

"

>

⬅️ Retour

</button>


</div>





<h1

className="

text-2xl

font-black

text-center

mb-8

"

>

🔔 Notifications

</h1>







{

notifications.length === 0 &&


<div

className="

bg-white/5

border

border-white/10

rounded-2xl

p-6

text-center

text-gray-400

"

>

Aucune notification

</div>


}








<div

className="

flex

flex-col

gap-4

"

>


{

notifications.map((item)=>(


<div

key={item.id}


onClick={()=>{

if(item.type==="message"){

openMessage(item);

}

}}


className="

relative

bg-white/10

border

border-white/20

rounded-3xl

p-5

cursor-pointer

"

>





{

!item.read &&


<span

className="

absolute

right-4

top-4

w-3

h-3

bg-red-500

rounded-full

animate-pulse

"

/>

}







{

item.type==="friend_request"

&&

<>


<h2 className="font-bold text-lg">

📩 Demande d'ami

</h2>


<p className="text-blue-300 mt-2">

{item.senderName || "Un joueur"}

</p>


<p className="text-gray-300 mt-1">

veut devenir ton ami

</p>



<div className="flex flex-col gap-3 mt-5">


<button

onClick={(e)=>{

e.stopPropagation();

acceptFriend(item);

}}

className="

w-full

bg-green-600

py-3.5

rounded-2xl

font-bold

"

>

✅ Accepter

</button>





<button

onClick={(e)=>{

e.stopPropagation();

refuseFriend(item);

}}

className="

w-full

bg-red-600

py-3.5

rounded-2xl

font-bold

"

>

❌ Refuser

</button>


</div>


</>

}








{

item.type==="message"

&&

<>


<h2 className="font-bold text-lg">

💬 Nouveau message

</h2>



<p className="text-blue-300 mt-2">

{item.senderName || "Joueur"}

</p>



<p className="text-gray-300 mt-1">

{item.text}

</p>



<p className="text-sm text-green-400 mt-4">

Cliquez pour répondre 💬

</p>


</>

}








{

item.type==="game_invite"

&&

<>


<h2 className="font-bold text-lg">

🎮 Invitation partie

</h2>



<p className="text-blue-300 mt-2">

{item.senderName || "Joueur"}

</p>



<p className="text-gray-300 mt-1">

t'invite à jouer

</p>



<button

onClick={(e)=>{

e.stopPropagation();


if(item.gameId){

router.push(`/game/${item.gameId}`);

}


}}

className="

mt-4

w-full

bg-green-600

py-3.5

rounded-2xl

font-bold

"

>

🎮 Rejoindre la partie

</button>


</>

}



</div>


))


}


</div>



</div>


</main>

);


}
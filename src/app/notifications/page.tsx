"use client";

import {
  useEffect,
  useState
} from "react";

import {
  useRouter
} from "next/navigation";

import {
  ArrowLeft,
  Bell
} from "lucide-react";

import {
  onAuthStateChanged
} from "firebase/auth";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc
} from "firebase/firestore";

import {
  auth,
  db
} from "@/lib/firebase";



export default function NotificationsPage(){


const router = useRouter();


const [userId,setUserId] =
useState<string>("");


const [notifications,setNotifications] =
useState<any[]>([]);






useEffect(()=>{


const unsubscribeAuth =

onAuthStateChanged(
auth,
(user)=>{


if(!user)
return;


setUserId(user.uid);




const notificationsRef =

collection(
db,
"notifications",
user.uid,
"items"
);



const q =

query(

notificationsRef,

orderBy(
"createdAt",
"desc"
)

);




const unsubscribe =

onSnapshot(
q,
(snapshot)=>{


const list =

snapshot.docs.map(
(item)=>({

id:item.id,

...item.data()

})

);



setNotifications(list);



}

);



return ()=>unsubscribe();


}


);



return ()=>unsubscribeAuth();



},[]);








async function openNotification(
notification:any
){



if(!userId)
return;




// mettre lu

await updateDoc(

doc(

db,

"notifications",

userId,

"items",

notification.id

),

{

read:true

}

);






// MESSAGE AMI

if(

notification.type === "message"

&&

notification.friendId

){


router.push(

`/chat/${notification.friendId}`

);


return;


}






// autres notifications

if(notification.link){


router.push(
notification.link
);


}



}








return (

<main

className="
min-h-screen
bg-gradient-to-br
from-[#020617]
via-[#07152f]
to-black
text-white
px-4
pb-24
pt-5
"

>



<div

className="
max-w-md
mx-auto
"

>



<div

className="
flex
items-center
gap-3
mb-6
"

>



<button

onClick={()=>router.back()}

className="
w-11
h-11
rounded-full
bg-white/10
flex
items-center
justify-center
"

>

<ArrowLeft/>

</button>





<h1

className="
text-xl
font-black
"

>

🔔 Notifications

</h1>



</div>







{

notifications.length === 0 &&

<div

className="
mt-20
text-center
text-gray-400
"

>

<Bell
size={45}
className="mx-auto mb-3"
/>


<p>

Aucune notification

</p>


</div>


}







<div

className="
space-y-3
"

>



{

notifications.map((n)=>(



<button


key={n.id}


onClick={()=>openNotification(n)}



className={`

w-full
text-left
rounded-3xl
p-4
border
transition

${

n.read

?

"bg-white/10 border-white/10"

:

"bg-blue-500/20 border-blue-400"

}

`}



>




<div

className="
flex
justify-between
items-start
gap-3
"

>


<h2

className="
font-black
"

>

{n.title}

</h2>



{

!n.read &&

<span

className="
bg-red-500
text-[10px]
px-2
py-1
rounded-full
font-bold
"

>

Nouveau

</span>


}



</div>





<p

className="
text-sm
text-gray-300
mt-2
"

>

{n.message}

</p>





{

n.amount > 0 &&

<p

className="
text-green-400
font-bold
mt-2
"

>

+{n.amount} HTG

</p>


}




</button>



))


}



</div>





</div>


</main>

);


}
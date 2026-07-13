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
  onAuthStateChanged
} from "firebase/auth";

import {
  database,
  auth
} from "@/lib/firebase";

import {
  getPlayerName
} from "@/lib/getPlayerName";



export default function FriendRequestsPage(){


const router = useRouter();


const [userId,setUserId] = useState("");

const [requests,setRequests] = useState<any[]>([]);

const [userNames,setUserNames] = useState<any>({});






// AUTH

useEffect(()=>{


const unsubscribe = onAuthStateChanged(

auth,

(user)=>{


if(user){

setUserId(user.uid);

}


}

);



return ()=>unsubscribe();


},[]);









// DEMANDES AMI

useEffect(()=>{


if(!userId)
return;



const requestsRef = ref(

database,

"friendRequests"

);



const unsubscribe = onValue(

requestsRef,

async(snapshot)=>{


const data = snapshot.val();



if(!data){

setRequests([]);

return;

}




const list = Object.entries(data)

.map(([id,value]:any)=>({

id,

...value

}))

.filter(

(item)=>

item.to === userId &&

item.status === "pending"

);



setRequests(list);





list.forEach(

async(request)=>{


const name = await getPlayerName(

request.from

);



setUserNames((prev:any)=>({


...prev,


[request.from]:name


}));


}



);



}


);



return ()=>unsubscribe();


},[userId]);









// ACCEPTER

async function acceptRequest(request:any){


await set(

ref(

database,

`friends/${userId}/${request.from}`

),

true

);



await set(

ref(

database,

`friends/${request.from}/${userId}`

),

true

);



await remove(

ref(

database,

`friendRequests/${request.id}`

)

);


}









// REFUSER

async function refuseRequest(id:string){


await remove(

ref(

database,

`friendRequests/${id}`

)

);


}









return(


<main

className="

min-h-screen

bg-gradient-to-br

from-[#020617]

via-[#07152f]

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

📩 Demandes d'ami

</h1>









<div

className="

flex

flex-col

gap-4

"

>





{

requests.length === 0 &&


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

Aucune demande d'ami

</div>


}








{

requests.map((request)=>(


<div

key={request.id}

className="

bg-white/10

border

border-white/20

rounded-3xl

p-5

shadow-xl

"

>


<div

className="

flex

items-center

gap-3

mb-5

"

>


<div

className="

w-12

h-12

rounded-full

bg-blue-600

flex

items-center

justify-center

text-xl

"

>

👤

</div>




<h2

className="

font-bold

text-base

break-all

"

>

{

userNames[request.from] ||

"Chargement..."

}

</h2>


</div>







<div

className="

flex

flex-col

gap-3

"

>


<button

onClick={()=>acceptRequest(request)}

className="

w-full

bg-green-600

py-3.5

rounded-2xl

font-bold

active:scale-95

transition

"

>

✅ Accepter

</button>






<button

onClick={()=>refuseRequest(request.id)}

className="

w-full

bg-red-600

py-3.5

rounded-2xl

font-bold

active:scale-95

transition

"

>

❌ Refuser

</button>



</div>





</div>


))


}





</div>




</div>


</main>


);


}
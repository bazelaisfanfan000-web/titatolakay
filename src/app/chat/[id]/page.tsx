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
  push,
  set,
  onValue,
  update,
  serverTimestamp,
  query,
  orderByChild
} from "firebase/database";


import {
  onAuthStateChanged
} from "firebase/auth";


import {
  auth,
  database
} from "@/lib/firebase";


import {
  sendNotification
} from "@/lib/notifications";


import {
  motion
} from "framer-motion";





export default function ChatPage(){


const router = useRouter();

const params = useParams();


const friendId =
params.id as string;



const [userId,setUserId] =
useState("");



const [message,setMessage] =
useState("");



const [messages,setMessages] =
useState<any[]>([]);





useEffect(()=>{


const unsubscribe =
onAuthStateChanged(

auth,

(user)=>{


if(user){

setUserId(user.uid);

}


}

);



return ()=>unsubscribe();



},[]);






const chatId =

userId && friendId

?

userId < friendId

?

`${userId}_${friendId}`

:

`${friendId}_${userId}`

:

"";








useEffect(()=>{


if(!chatId)

return;



const messagesRef =

query(

ref(

database,

`chats/${chatId}`

),

orderByChild(

"timestamp"

)

);





const unsubscribe =

onValue(

messagesRef,

(snapshot)=>{


const data =
snapshot.val();



if(!data){

setMessages([]);

return;

}





const list =

Object.entries(data)

.map(

([id,value]:any)=>({


id,

...value


})

);



setMessages(list);






list.forEach(async(msg)=>{


if(

msg.senderId === friendId

&&

msg.read !== true

){


await update(

ref(

database,

`chats/${chatId}/${msg.id}`

),

{

read:true

}

);


}


});





}

);



return ()=>unsubscribe();



},[chatId,friendId]);








async function sendMessage(){


if(!message.trim())

return;



if(!chatId)

return;





const text = message;





const messageRef =

push(

ref(

database,

`chats/${chatId}`

)

);





await set(

messageRef,

{


senderId:userId,


text,


timestamp:serverTimestamp(),


read:false


}

);







// Notification ami

await sendNotification(

friendId,

{

title:"💬 Nouveau message",

message:"Tu as reçu un nouveau message",

type:"message",

from:userId,

text:text,

friendId:userId,

link:`/chat/${userId}`

}

);





setMessage("");



}









async function inviteToGame(){



await sendNotification(

friendId,

{

title:"🎮 Invitation de partie",

message:"Un ami t'invite à jouer",

type:"game_invite",

from:userId,

friendId:userId,

link:`/chat/${userId}`

}

);



alert(

"🎮 Invitation envoyée"

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
flex
flex-col
"

>



<header

className="
p-4
border-b
border-white/10
bg-white/5
backdrop-blur-xl
"

>



<button

onClick={()=>router.back()}


className="
bg-white/10
border
border-white/20
px-4
py-2
rounded-xl
mb-4
font-bold
"

>

⬅️ Retour

</button>





<h1

className="
text-2xl
font-black
"

>

💬 Discussion

</h1>






<button

onClick={inviteToGame}

className="
mt-4
w-full
py-4
rounded-2xl
font-black
bg-green-600
"

>

🎮 Inviter à jouer

</button>



</header>







<section

className="
flex-1
overflow-y-auto
p-4
space-y-3
"

>


{

messages.map((msg)=>(


<motion.div

key={msg.id}

initial={{
opacity:0,
y:10
}}

animate={{
opacity:1,
y:0
}}


className={`

max-w-[80%]

px-4

py-3

rounded-2xl

${

msg.senderId === userId

?

"ml-auto bg-blue-600"

:

"bg-white/10"

}

`}

>


{msg.text}



</motion.div>


))

}



</section>







<footer

className="
p-4
border-t
border-white/10
flex
gap-2
"

>



<input

value={message}

onChange={(e)=>
setMessage(e.target.value)
}

onKeyDown={(e)=>{

if(e.key==="Enter"){

sendMessage();

}

}}

placeholder="Écrire un message..."

className="
flex-1
bg-white/10
rounded-xl
px-4
py-3
outline-none
"

/>





<button

onClick={sendMessage}

className="
bg-blue-600
px-5
rounded-xl
font-bold
"

>

➤

</button>



</footer>





</main>


);


}
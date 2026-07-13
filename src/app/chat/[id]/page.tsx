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


text:message,


timestamp:serverTimestamp(),


read:false


}

);





await sendNotification(


friendId,


{


type:"message",


from:userId,


text:message


}


);





setMessage("");



}








async function inviteToGame(){


await sendNotification(


friendId,


{


type:"game_invite",


from:userId


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
shadow-[0_4px_0_rgba(0,0,0,.5)]
active:translate-y-1
active:shadow-none
transition
"

>

⬅️ Retour

</button>







<h1

className="
text-2xl
font-black
bg-gradient-to-r
from-cyan-300
to-blue-500
bg-clip-text
text-transparent
"

>

💬 Discussion

</h1>







<p

className="
text-green-400
mt-2
font-bold
"

>

🟢 En ligne

</p>








<button

onClick={inviteToGame}

className="
mt-4
w-full
py-4
rounded-2xl
font-black
bg-gradient-to-b
from-green-300
via-green-500
to-green-800
border
border-green-300/50
shadow-[0_7px_0_#166534]
active:translate-y-[5px]
active:shadow-[0_2px_0_#166534]
transition-all
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

font-medium

shadow-[0_5px_10px_rgba(0,0,0,.4)]

${

msg.senderId === userId


?


"ml-auto bg-gradient-to-b from-blue-400 to-blue-700 border border-blue-300/40"


:


"bg-white/10 border border-white/20 backdrop-blur-xl"

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
bg-black/20
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
border
border-white/20
rounded-2xl
px-4
py-3
outline-none
shadow-inner
"


/>








<button

onClick={sendMessage}


className="
bg-gradient-to-b
from-cyan-300
via-blue-500
to-blue-800
px-5
rounded-2xl
font-black
border
border-cyan-300/40
shadow-[0_6px_0_#123a8a]
active:translate-y-[4px]
active:shadow-[0_2px_0_#123a8a]
transition-all
"

>

➤

</button>








</footer>






</main>


);


}
"use client";

import {
  useEffect,
  useState,
  useRef
} from "react";


import {
  ref,
  onValue,
  query,
  limitToLast,
  push,
  set
} from "firebase/database";


import {
  rtdb
} from "@/lib/firebase";



type Props = {

  roomId:string;

  uid:string;

  userName:string;

};



type Message = {

  id:string;

  uid:string;

  name:string;

  message:string;

  timestamp:number;

};




export default function GameChat({

roomId,

uid,

userName

}:Props){



const [messages,setMessages] =
useState<Message[]>([]);



const [text,setText] =
useState("");



const endRef =
useRef<HTMLDivElement>(null);






useEffect(()=>{


const chatRef =

ref(

rtdb,

`rooms/${roomId}/chat`

);



const chatQuery =

query(

chatRef,

limitToLast(50)

);





const unsubscribe =

onValue(

chatQuery,

(snapshot)=>{


const data =
snapshot.val();



if(!data){

setMessages([]);

return;

}




const list =

Object.entries(data)

.map(([id,value]:any)=>({

id,

uid:value.uid || "",

name:value.name || "Joueur",

message:value.message || "",

timestamp:value.timestamp || Date.now()

}))

.sort(

(a,b)=>

a.timestamp - b.timestamp

);




setMessages(list);



}

);





return()=>unsubscribe();



},[roomId]);








useEffect(()=>{


endRef.current?.scrollIntoView({

behavior:"smooth"

});


},[messages]);










async function sendMessage(){



if(!text.trim()){

return;

}



if(!uid){

alert(

"Utilisateur non connecté"

);

return;

}




try{



const chatRef =

ref(

rtdb,

`rooms/${roomId}/chat`

);



const messageRef =

push(chatRef);





await set(

messageRef,

{

uid: uid,

name: userName || "Joueur",

message:text.trim(),

timestamp:Date.now()

}

);





setText("");



}

catch(error){


console.error(

"Erreur envoi chat",

error

);


}



}








const emojis = [

"😀",
"😂",
"🎮",
"🏆",
"🔥",
"👍",
"❤️",
"🎉"

];








return(


<div

className="

w-full

max-w-md

mt-4

bg-white/10

backdrop-blur

rounded-2xl

border

border-white/10

overflow-hidden

"

>



<div

className="

p-3

font-bold

border-b

border-white/10

"

>

💬 Chat

</div>







<div

className="

h-64

overflow-y-auto

p-3

space-y-3

"

>



{

messages.length===0 &&

<p className="text-gray-400 text-sm text-center">

Aucun message

</p>

}






{

messages.map((msg)=>(



<div

key={msg.id}

className={

msg.uid===uid

?

"text-right"

:

"text-left"

}

>


<p className="text-xs text-gray-400">

{msg.name}

</p>





<div

className={

msg.uid===uid

?

"inline-block bg-blue-600 px-3 py-2 rounded-xl"

:

"inline-block bg-gray-700 px-3 py-2 rounded-xl"

}

>

{msg.message}

</div>



</div>



))

}





<div ref={endRef}/>



</div>








<div

className="

px-3

py-2

flex

gap-1

overflow-x-auto

"

>


{

emojis.map((emoji)=>(


<button

key={emoji}

onClick={()=>setText(prev=>prev+emoji)}

className="text-xl"

>

{emoji}

</button>


))


}



</div>









<div

className="

p-3

border-t

border-white/10

flex

gap-2

"

>


<input

value={text}

onChange={(e)=>

setText(e.target.value)

}

onKeyDown={(e)=>{

if(e.key==="Enter"){

sendMessage();

}

}}

placeholder="Écrire un message..."

className="

flex-1

bg-black/30

rounded-xl

px-3

py-2

outline-none

text-white

"

/>






<button

onClick={sendMessage}

className="

bg-blue-600

px-4

rounded-xl

font-bold

"

>

🚀

</button>




</div>







</div>


);


}
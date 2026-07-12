"use client";


import {
useEffect,
useState
} from "react";


import {
ref,
onValue
} from "firebase/database";


import {
database
} from "@/lib/firebase";


import {
sendMessage
} from "@/lib/firebaseChat";




interface Props{

roomId:string;

uid:string;

name:string;

}




export default function GameChat({

roomId,

uid,

name

}:Props){



const [messages,setMessages]=useState<any[]>([]);

const [text,setText]=useState("");




useEffect(()=>{


const chatRef =
ref(
database,
`rooms/${roomId}/chat`
);



return onValue(

chatRef,

snap=>{


const data=snap.val();


if(!data){

setMessages([]);

return;

}



setMessages(

Object.values(data)

);


}

);



},[roomId]);







async function send(){


await sendMessage(

roomId,

uid,

name,

text

);


setText("");


}






return(

<div

className="

mt-6

bg-white/10

border

border-white/20

rounded-3xl

p-4

"

>



<h2 className="
text-white
font-black
text-xl
mb-3
">

💬 Chat

</h2>





<div

className="

h-40

overflow-y-auto

space-y-2

"

>


{

messages.map(

(msg:any,index)=>(


<div

key={index}

className="

bg-black/30

rounded-xl

p-2

text-white

"

>


<b>

{msg.name}

:

</b>


{" "}

{msg.text}



</div>


)


)


}



</div>





<div className="

flex

gap-2

mt-3

">


<input


value={text}


onChange={e=>setText(e.target.value)}


placeholder="Message..."


className="

flex-1

bg-black/40

text-white

rounded-xl

px-3

outline-none

"


/>



<button

onClick={send}

className="

bg-blue-600

px-4

rounded-xl

font-bold

"

>

Envoyer

</button>



</div>





</div>

);


}
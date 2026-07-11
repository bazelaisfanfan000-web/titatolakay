"use client";

import { useEffect, useState } from "react";

import {
collection,
addDoc,
query,
where,
orderBy,
onSnapshot,
serverTimestamp
} from "firebase/firestore";

import { db, auth } from "@/lib/firebase";



export default function SpectatorChat({
roomId
}:{
roomId:string
}){


const [messages,setMessages]=useState<any[]>([]);

const [text,setText]=useState("");



const emojis = [

"🔥",
"👏",
"😂",
"😮",
"😡",
"❤️",
"🎯",
"💪"

];






useEffect(()=>{


const q=query(

collection(db,"spectatorChats"),

where(
"roomId",
"==",
roomId
),

orderBy(
"createdAt",
"asc"
)

);



const unsubscribe=onSnapshot(q,(snapshot)=>{


setMessages(

snapshot.docs.map(doc=>({

id:doc.id,

...doc.data()

}))

);


});



return ()=>unsubscribe();


},[roomId]);









async function sendMessage(value?:string){


const user=auth.currentUser;


if(!user) return;



const message=value || text;



if(!message.trim()) return;





await addDoc(

collection(db,"spectatorChats"),

{

roomId,

userId:user.uid,

username:
user.displayName || "Spectateur",

message,

type:value ? "emoji":"text",

createdAt:serverTimestamp()

}

);



setText("");



}









return (

<div className="
bg-white/10
border
border-white/20
rounded-2xl
p-3
mt-4
">





<h2 className="
font-bold
text-sm
mb-3
">

💬 Réactions spectateurs

</h2>








{/* EMOJIS RAPIDES */}


<div className="
flex
gap-2
flex-wrap
mb-3
">


{

emojis.map((emoji)=>(


<button

key={emoji}

onClick={()=>sendMessage(emoji)}

className="
bg-black/30
rounded-full
w-8
h-8
text-lg
active:scale-90
transition
"

>

{emoji}

</button>


))


}


</div>









{/* MESSAGES */}


<div className="
h-36
overflow-y-auto
space-y-2
">



{

messages.map((msg)=>(


<div

key={msg.id}

className="
bg-black/30
rounded-lg
p-2
text-xs
"


>


<span className="
text-blue-400
font-bold
">

{msg.username}

</span>


{" "}

{msg.message}



</div>


))


}



</div>








{/* MESSAGE TEXTE */}


<div className="
flex
gap-2
mt-3
">


<input

value={text}

onChange={(e)=>setText(e.target.value)}

placeholder="Message..."

className="
flex-1
bg-white/10
rounded-lg
px-3
py-2
text-xs
outline-none
"

/>





<button

onClick={()=>sendMessage()}

className="
bg-purple-600
px-3
rounded-lg
text-xs
font-bold
"

>

➤

</button>


</div>






</div>

);


}
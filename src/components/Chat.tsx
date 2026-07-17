"use client";

import React, {
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
  useRouter
} from "next/navigation";


import {
  rtdb,
  database
} from "@/lib/firebase";


import {
  ref as dbRef
} from "firebase/database";



interface ChatMessage {

id:string;

uid:string;

name:string;

message:string;

timestamp:number;

premium?:boolean;

}



interface ChatProps {

roomId:string;

uid:string;

userName:string;

}




export default function Chat({

roomId,

uid,

userName

}:ChatProps){



const router =
useRouter();




const [
messages,
setMessages
]=useState<ChatMessage[]>([]);



const [
newMessage,
setNewMessage
]=useState("");



const [
isPremium,
setIsPremium
]=useState(false);



const [
sending,
setSending
]=useState(false);




const messagesEndRef =
useRef<HTMLDivElement>(null);



const inputRef =
useRef<HTMLInputElement>(null);







useEffect(()=>{


const userPremiumRef =

dbRef(

database,

`users/${uid}/premium`

);




const unsubscribe =

onValue(

userPremiumRef,

(snapshot)=>{


const data =
snapshot.val();




if(!data){

setIsPremium(false);

return;

}




const expire =

new Date(
data.expireDate
);




setIsPremium(

data.active === true
&&
expire > new Date()

);



}

);





return()=>{

unsubscribe();

};


},[uid]);







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

(snap)=>{


const data =
snap.val();




if(data){


const list =

Object.entries(data)

.map(([id,msg]:any)=>({

id,

...msg

}))


.sort(

(a,b)=>

a.timestamp - b.timestamp

);



setMessages(list);



}

else{


setMessages([]);

}



}

);






return()=>{

unsubscribe();

};



},[roomId]);







useEffect(()=>{


messagesEndRef.current?.scrollIntoView({

behavior:"smooth"

});


},[messages]);const handleSendMessage = async()=>{


if(
!newMessage.trim()
||
sending
)

return;





if(!isPremium){


alert(
"⭐ Le chat texte est réservé aux membres Premium"
);


router.push("/premium");


return;


}





if(newMessage.length > 200){


alert(
"Message trop long"
);


return;


}





try{


setSending(true);




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

uid,

name:userName,

message:newMessage.trim(),

premium:true,

timestamp:Date.now()

}

);






setNewMessage("");



}

catch(error){


console.log(
"CHAT ERROR",
error
);



}

finally{


setSending(false);


}



};







const addEmoji=(emoji:string)=>{


setNewMessage(

prev=>

prev + emoji

);



inputRef.current?.focus();



};







const formatTime=(timestamp:number)=>{


return new Date(timestamp)

.toLocaleTimeString(

"fr-HT",

{

hour:"2-digit",

minute:"2-digit"

}

);


};







const emojis=[

"😀",
"😂",
"🎮",
"🏆",
"💪",
"🔥",
"👍",
"❤️",
"🎉",
"🤔"

];







return(


<div

className="
bg-gray-900
rounded-xl
flex
flex-col
h-96
overflow-hidden
"

>





<div

className="
px-4
py-3
border-b
border-gray-700
flex
justify-between
"

>


<h3 className="
text-white
font-bold
">

💬 Chat

</h3>





{

isPremium &&

<span

className="
text-yellow-400
text-xs
"

>

⭐ Premium

</span>

}



</div>







<div

className="
flex-1
overflow-y-auto
p-4
space-y-3
"

>



{

messages.length === 0 &&

<p

className="
text-gray-500
text-center
text-sm
"

>

Aucun message

</p>

}





{

messages.map((msg)=>(


<div

key={msg.id}

className={

msg.uid === uid

?

"flex flex-col items-end"

:

"flex flex-col items-start"

}

>


<div

className="
flex
gap-2
text-xs
text-gray-400
"

>


<span>

{msg.name}

{msg.premium && " ⭐"}

</span>




<span>

{formatTime(msg.timestamp)}

</span>



</div><div

className={

msg.uid===uid

?

"bg-blue-600 text-white px-3 py-2 rounded-lg max-w-xs"

:

"bg-gray-700 text-white px-3 py-2 rounded-lg max-w-xs"

}

>

{msg.message}

</div>


</div>


))

}



<div ref={messagesEndRef}/>



</div>








<div

className="
border-t
border-gray-700
p-3
"

>


<div

className="
flex
gap-1
overflow-x-auto
"

>


{

emojis.map((emoji)=>(


<button

key={emoji}

onClick={()=>addEmoji(emoji)}

className="
text-2xl
"

>

{emoji}

</button>



))

}



</div>



</div>








<div

className="
border-t
border-gray-700
p-3
"

>



<div

className="
flex
gap-2
"

>




<input


ref={inputRef}


value={newMessage}


onChange={(e)=>

setNewMessage(e.target.value)

}



onKeyDown={(e)=>{


if(e.key==="Enter"){

handleSendMessage();

}


}}



placeholder={

isPremium

?

"Écrire un message..."

:

"⭐ Chat Premium"

}



className="
flex-1
bg-gray-700
text-white
rounded-lg
px-3
py-2
outline-none
"

/>







<button


onClick={handleSendMessage}



disabled={sending}



className="
bg-gradient-to-b
from-blue-400
to-blue-700
px-5
py-2
rounded-xl
text-white
font-black
text-sm
shadow-[0_5px_0_#123a8a]
hover:scale-105
active:translate-y-1
active:shadow-[0_2px_0_#123a8a]
transition-all
disabled:opacity-50
"

>



{

sending

?

"⏳"

:

"🚀 Envoyer"

}



</button>





</div>





</div>








</div>


);



}
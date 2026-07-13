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
  onValue
} from "firebase/database";

import {
  onAuthStateChanged
} from "firebase/auth";

import {
  database,
  auth
} from "@/lib/firebase";



export default function FriendsPage(){


const router = useRouter();


const [userId,setUserId] =
useState("");



const [friends,setFriends] =
useState<any[]>([]);



const [lastMessages,setLastMessages] =
useState<any>({});



const [unreadMessages,setUnreadMessages] =
useState<any>({});





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







useEffect(()=>{


if(!userId)
return;



const friendsRef =
ref(
database,
`friends/${userId}`
);



const unsubscribe =
onValue(
friendsRef,
(snapshot)=>{


const data =
snapshot.val();



if(!data){

setFriends([]);

return;

}



const friendIds =
Object.keys(data);





const usersRef =
ref(
database,
"users"
);



onValue(
usersRef,
(usersSnapshot)=>{


const users =
usersSnapshot.val();



const list =
friendIds.map((id)=>({


id,


name:
users?.[id]?.username ||
"Utilisateur",



online:
users?.[id]?.online ||
false



}));



setFriends(list);



}



);



}

);



return ()=>unsubscribe();



},[userId]);// messages + compteur

useEffect(()=>{


if(!userId || friends.length===0)
return;



const listeners:any[]=[];



friends.forEach((friend)=>{


const chatId =

userId < friend.id

?

`${userId}_${friend.id}`

:

`${friend.id}_${userId}`;





const chatRef =

ref(

database,

`chats/${chatId}`

);







const unsubscribe =

onValue(

chatRef,

(snapshot)=>{


const data =
snapshot.val();



if(!data){

return;

}






const messages =

Object.values(data) as any[];






messages.sort(

(a,b)=>

(a.timestamp || 0)

-

(b.timestamp || 0)

);






const last =

messages[messages.length - 1];






if(last){


setLastMessages(

(prev:any)=>({

...prev,

[friend.id]:

last.text

})

);



}








let unreadCount = 0;



messages.forEach((msg:any)=>{


if(

msg.senderId === friend.id

&&

msg.read !== true

){


unreadCount++;


}


});








setUnreadMessages(

(prev:any)=>({

...prev,

[friend.id]:

unreadCount


})

);




}


);



listeners.push(unsubscribe);



});







return ()=>{


listeners.forEach(

(unsub)=>unsub()

);


};



},[

userId,

friends

]);









return(

<main

className="
min-h-screen
bg-gradient-to-br
from-[#020617]
via-[#07152f]
to-black
text-white
px-3
pb-8
"

>


<div

className="
w-full
max-w-md
mx-auto
"

>


{/* HEADER MOBILE */}

<div

className="
sticky
top-0
z-10
bg-[#020617]/90
backdrop-blur
py-4
mb-4
"

>


<div

className="
flex
items-center
justify-between
"

>


<button

onClick={()=>router.back()}

className="
w-11
h-11
rounded-full
bg-white/10
border
border-white/20
flex
items-center
justify-center
text-lg
active:scale-90
transition
"

>

⬅️

</button>





<h1

className="
text-xl
font-black
"

>

👥 Mes amis

</h1>




<div

className="
w-11
"

></div>



</div>



</div><div

className="
space-y-3
"

>



{

friends.length===0 &&


<div

className="
bg-white/10
border
border-white/10
rounded-3xl
p-8
text-center
text-gray-400
"

>

<div className="text-4xl mb-3">
👤
</div>


<p>
Aucun ami
</p>


</div>


}








{

friends.map((friend)=>(


<button


key={friend.id}


onClick={()=>router.push(`/chat/${friend.id}`)}


className="
w-full
bg-white/10
border
border-white/20
rounded-3xl
p-4
shadow-lg
active:scale-[0.97]
transition
"

>



<div

className="
flex
items-center
gap-3
"

>




{/* AVATAR */}

<div

className="
w-14
h-14
rounded-full
bg-gradient-to-br
from-blue-500
to-green-400
flex
items-center
justify-center
text-2xl
shrink-0
"

>

👤

</div>








<div

className="
flex-1
overflow-hidden
text-left
"

>



<div

className="
flex
items-center
gap-2
"

>


<h2

className="
font-bold
text-base
truncate
"

>

{friend.name}

</h2>




<span>

{

friend.online

?

"🟢"

:

"⚪"

}

</span>



</div>








<p

className="
text-xs
text-gray-400
truncate
mt-1
"

>


{

lastMessages[friend.id]

?

"💬 " + lastMessages[friend.id]

:

"💬 Ouvrir la discussion"

}


</p>



</div>









{

unreadMessages[friend.id] > 0 &&


<span

className="
bg-red-500
min-w-[24px]
h-6
px-2
rounded-full
flex
items-center
justify-center
text-xs
font-black
"

>

{

unreadMessages[friend.id]

}


</span>


}







</div>






</button>



))


}



</div>






</div>


</main>


);


}
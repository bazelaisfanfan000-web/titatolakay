"use client";

import { useEffect, useState } from "react";

import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

import {
collection,
query,
where,
orderBy,
onSnapshot,
updateDoc,
doc
} from "firebase/firestore";

import { db, auth } from "@/lib/firebase";



export default function NotificationsPage(){


const [notifications,setNotifications] = useState<any[]>([]);





useEffect(()=>{


const user = auth.currentUser;


if(!user) return;





const q = query(

collection(db,"notifications"),

where(
"userId",
"==",
user.uid
),

orderBy(
"createdAt",
"desc"
)

);





const unsubscribe = onSnapshot(q,(snapshot)=>{


const data = snapshot.docs.map((item)=>{


return {

id:item.id,

...item.data()

};


});



setNotifications(data);





// marquer comme lu

snapshot.docs.forEach(async(item)=>{


if(item.data().read === false){


await updateDoc(

doc(
db,
"notifications",
item.id
),

{

read:true

}

);


}



});




});





return ()=>unsubscribe();



},[]);







return (

<main className="
min-h-screen
bg-black
text-white
pt-16
pb-20
px-4
">


<Header />





<div className="
max-w-sm
mx-auto
pt-8
">





<h1 className="
text-xl
font-black
mb-5
">

🔔 Notifications

</h1>







{

notifications.length === 0 && (

<div className="
bg-white/10
border
border-white/20
rounded-xl
p-4
text-center
text-sm
">

Aucune notification

</div>

)

}









<div className="
flex
flex-col
gap-3
">



{

notifications.map((n)=>(


<div

key={n.id}

className="
bg-white/10
border
border-white/20
rounded-2xl
p-4
"


>


<h2 className="
font-bold
text-sm
">

{n.title}

</h2>




<p className="
text-xs
text-gray-300
mt-2
">

{n.message}

</p>






</div>


))


}



</div>







</div>







<BottomNav />



</main>


);


}
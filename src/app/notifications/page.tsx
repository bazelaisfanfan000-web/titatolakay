"use client";

import {
  useEffect,
  useState
} from "react";


import {
  motion
} from "framer-motion";


import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc
} from "firebase/firestore";


import {
  db,
  auth
} from "@/lib/firebase";


import BackButton from "@/components/BackButton";







export default function NotificationsPage(){



const [
notifications,
setNotifications
]=useState<any[]>([]);









useEffect(()=>{


const user = auth.currentUser;



if(!user)
return;







const q = query(


collection(
db,
"notifications"
),


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








const unsubscribe = onSnapshot(


q,


(snapshot)=>{



const data = snapshot.docs.map((item)=>{


return{


id:item.id,


...item.data()


};


});





setNotifications(data);








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



}


);








return()=>unsubscribe();




},[]);









return(


<main


className="
min-h-screen
relative
overflow-hidden
bg-gradient-to-br
from-[#020617]
via-[#07152f]
to-black
text-white
px-4
py-10
"

>








<motion.div


animate={{

x:[0,40,0],

y:[0,20,0]

}}


transition={{

duration:6,

repeat:Infinity

}}


className="
absolute
w-56
h-56
bg-blue-500/20
rounded-full
blur-3xl
top-0
left-[-60px]
"

/>









<motion.div


animate={{

x:[0,-40,0],

y:[0,-20,0]

}}


transition={{

duration:7,

repeat:Infinity

}}


className="
absolute
w-56
h-56
bg-purple-500/20
rounded-full
blur-3xl
bottom-10
right-[-60px]
"

/>









<div

className="
relative
z-10
max-w-sm
mx-auto
"

>






<div className="mb-5">

<BackButton />

</div>









<motion.h1


animate={{

y:[0,-5,0]

}}


transition={{

duration:3,

repeat:Infinity

}}


className="
text-xl
font-black
text-center
mb-8
bg-gradient-to-r
from-blue-400
to-cyan-300
bg-clip-text
text-transparent
"

>


🔔 Notifications


</motion.h1>









{

notifications.length === 0 && (



<motion.div


initial={{

opacity:0,

scale:.8

}}



animate={{

opacity:1,

scale:1

}}



className="
bg-white/10
backdrop-blur-2xl
border
border-white/20
rounded-3xl
p-5
text-center
text-sm
text-gray-300
"

>


🔔 Aucune notification


</motion.div>


)

}









<div

className="
flex
flex-col
gap-4
"

>



{

notifications.map((n,index)=>(





<motion.div


key={n.id}



initial={{

opacity:0,

y:30

}}



animate={{

opacity:1,

y:0

}}



transition={{

delay:index * 0.1

}}



whileHover={{

scale:1.02,

y:-3

}}



className="
bg-white/10
backdrop-blur-2xl
border
border-white/20
rounded-3xl
p-5
shadow-2xl
"

>






<div

className="
flex
items-center
gap-3
"

>


<div

className="
w-11
h-11
rounded-2xl
bg-blue-500/20
border
border-blue-400/30
flex
items-center
justify-center
text-xl
"

>

🔔

</div>







<div>


<h2

className="
font-bold
text-sm
"

>

{n.title}

</h2>




<p

className="
text-[10px]
text-gray-400
mt-1
"

>

Ti Ta To

</p>


</div>



</div>








<p

className="
text-xs
text-gray-300
mt-4
leading-relaxed
"

>

{n.message}

</p>








{

n.amount && (


<div


className="
mt-4
inline-flex
bg-green-500/20
border
border-green-400/30
rounded-xl
px-3
py-1
text-green-400
text-xs
font-bold
"

>


🎁 +{n.amount} HTG


</div>


)


}






</motion.div>



))


}



</div>









<motion.p


animate={{

opacity:[0.4,1,0.4]

}}



transition={{

duration:3,

repeat:Infinity

}}



className="
text-center
text-[10px]
text-cyan-300
font-bold
mt-8
"

>


🧪 Ti Ta To - Version bêta


</motion.p>








</div>






</main>


);


}
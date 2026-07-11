"use client";


import {
  useEffect,
  useState
} from "react";


import {
  ref,
  onValue,
  update
} from "firebase/database";


import {
  database
} from "@/lib/firebase";





export default function AdminSettingsPage(){



const [settings,setSettings] =
useState<any>({});



const [commission,setCommission] =
useState(10);



const [bonus,setBonus] =
useState(1000);



const [message,setMessage] =
useState("");



const [loading,setLoading] =
useState(false);







useEffect(()=>{


const settingsRef =
ref(
database,
"settings"
);



const unsubscribe =
onValue(

settingsRef,

(snapshot)=>{


const data =
snapshot.val() || {};



setSettings(data);



setCommission(
data.commission ?? 10
);



setBonus(
data.dailyBonus ?? 1000
);



}



);



return()=>unsubscribe();



},[]);








async function saveSettings(){



setLoading(true);



await update(

ref(
database,
"settings"
),

{


commission:


Number(commission),



dailyBonus:


Number(bonus),



betaMode:true



}

);



setLoading(false);



alert(
"✅ Paramètres sauvegardés"
);



}










async function sendGlobalMessage(){



if(!message)
return;



const usersSnap =
await new Promise<any>((resolve)=>{


onValue(

ref(database,"users"),

(snapshot)=>{


resolve(snapshot.val() || {});


},

{
onlyOnce:true
}

);


});






const updates:any={};



Object.keys(usersSnap)
.forEach((uid)=>{



const id =

Date.now()
+
Math.random();




updates[

`notifications/${uid}/${id}`

]
=

{

title:"📢 Message Domino Lakay",

message,


read:false,


createdAt:Date.now()


};



});






await update(

ref(database),

updates

);




setMessage("");



alert(
"✅ Message envoyé à tous les joueurs"
);



}









return(


<div>


<h1 className="
text-3xl
font-black
">

⚙️ Paramètres plateforme

</h1>



<p className="
text-gray-400
mt-2
">

Configuration globale Domino Lakay

</p>








<div className="
mt-8
bg-white/5
border
border-white/10
rounded-3xl
p-6
space-y-6
">






<div>

<label>

🏦 Commission plateforme (%)

</label>


<input

type="number"

value={commission}

onChange={(e)=>
setCommission(
Number(e.target.value)
)
}

className="
mt-2
w-full
bg-black
border
border-white/20
rounded-xl
p-3
"

/>


</div>








<div>

<label>

🎁 Bonus quotidien HTG

</label>


<input

type="number"

value={bonus}

onChange={(e)=>
setBonus(
Number(e.target.value)
)
}

className="
mt-2
w-full
bg-black
border
border-white/20
rounded-xl
p-3
"

/>


</div>








<div className="
bg-green-600/20
border
border-green-500/20
rounded-xl
p-4
">


🧪 Mode bêta :

<b>
ACTIVÉ
</b>


</div>








<button

onClick={saveSettings}

disabled={loading}

className="
w-full
bg-blue-600
py-3
rounded-xl
font-bold
"

>


{

loading ?

"⏳ Sauvegarde..."

:

"💾 Sauvegarder"

}


</button>




</div>









<div className="
mt-8
bg-white/5
border
border-white/10
rounded-3xl
p-6
">



<h2 className="
font-bold
text-xl
">

📢 Message global

</h2>




<textarea

value={message}

onChange={(e)=>
setMessage(
e.target.value
)
}

placeholder="
Message pour tous les joueurs...
"

className="
mt-4
w-full
h-32
bg-black
border
border-white/20
rounded-xl
p-4
"

/>







<button

onClick={sendGlobalMessage}

className="
mt-4
w-full
bg-purple-600
py-3
rounded-xl
font-bold
"

>

📢 Envoyer à tous

</button>





</div>







</div>


);


}
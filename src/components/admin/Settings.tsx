"use client";


import {
useEffect,
useState
} from "react";


import {
database
} from "@/lib/firebase";


import {
ref,
onValue,
set
} from "firebase/database";





export default function Settings(){


const [commission,setCommission]=useState(10);


const [minBet,setMinBet]=useState(50);


const [maxBet,setMaxBet]=useState(1000);


const [maintenance,setMaintenance]=useState(false);





useEffect(()=>{


const settingsRef =
ref(database,"platform/settings");



return onValue(

settingsRef,

(snapshot)=>{


const data =
snapshot.val();



if(data){


setCommission(
data.commission || 10
);


setMinBet(
data.minBet || 50
);


setMaxBet(
data.maxBet || 1000
);


setMaintenance(
data.maintenance || false
);


}


}

);



},[]);









async function save(){



await set(

ref(
database,
"platform/settings"
),

{


commission,

minBet,

maxBet,

maintenance


}

);



alert(
"⚙️ Paramètres sauvegardés"
);



}









return(


<div className="text-white">



<h1 className="
text-2xl
font-black
">

⚙️ Paramètres admin

</h1>



<p className="
text-gray-400
text-sm
mt-2
">

Configuration plateforme

</p>







<div className="
mt-6
space-y-4
">







<div>

<p>

📈 Commission plateforme (%)

</p>


<input

type="number"

value={commission}

onChange={
e=>setCommission(
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

<p>
💰 Mise minimum
</p>


<input

type="number"

value={minBet}

onChange={
e=>setMinBet(
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

<p>
💰 Mise maximum
</p>


<input

type="number"

value={maxBet}

onChange={
e=>setMaxBet(
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







<label className="
flex
items-center
gap-3
bg-white/5
p-4
rounded-xl
">


<input

type="checkbox"

checked={maintenance}

onChange={
e=>setMaintenance(
e.target.checked
)
}

/>


🔧 Mode maintenance


</label>







<button

onClick={save}

className="
w-full
bg-blue-600
py-3
rounded-xl
font-bold
"

>

💾 Sauvegarder

</button>






</div>





</div>


);


}
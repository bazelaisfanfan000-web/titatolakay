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





export default function Settings(){



const [settings,setSettings] =
useState<any>({

commission:10,

minBet:50,

maxBet:1000,

maintenance:false,

depositEnabled:true,

withdrawEnabled:true

});



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
snapshot.val();


if(data){

setSettings(data);

}


}

);



return()=>unsubscribe();



},[]);









function change(
key:string,
value:any
){


setSettings({

...settings,

[key]:value

});


}









async function save(){


setLoading(true);



await update(

ref(
database,
"settings"
),

settings

);



setLoading(false);



alert(
"✅ Paramètres sauvegardés"
);



}









return(


<div className="text-white">






<h1 className="
text-3xl
font-black
">

⚙️ Paramètres administrateur

</h1>



<p className="
text-gray-400
mt-2
">

Configuration générale DOMINOS HAÏTI

</p>









<div className="
mt-8
grid
md:grid-cols-2
gap-5
">







{/* ECONOMIE */}



<div className="

bg-[#111827]

border

border-white/10

rounded-3xl

p-6

">


<h2 className="
text-xl
font-black
">

💰 Économie

</h2>






<label className="
block
mt-5
text-gray-400
">

Commission plateforme (%)

</label>


<input


type="number"


value={settings.commission}


onChange={(e)=>
change(
"commission",
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
p-4
"

/>







<label className="
block
mt-5
text-gray-400
">

Mise minimum HTG

</label>


<input


type="number"


value={settings.minBet}


onChange={(e)=>
change(
"minBet",
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
p-4
"

/>








<label className="
block
mt-5
text-gray-400
">

Mise maximum HTG

</label>


<input


type="number"


value={settings.maxBet}


onChange={(e)=>
change(
"maxBet",
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
p-4
"

/>






</div>










{/* SYSTEME */}



<div className="

bg-[#111827]

border

border-white/10

rounded-3xl

p-6

">


<h2 className="
text-xl
font-black
">

🔧 Système

</h2>









<div className="
mt-5
space-y-4
">





<label className="
flex
justify-between
bg-black/30
p-4
rounded-xl
">

<span>
🏦 Dépôts activés
</span>


<input

type="checkbox"

checked={
settings.depositEnabled
}

onChange={(e)=>
change(
"depositEnabled",
e.target.checked
)
}


/>

</label>









<label className="
flex
justify-between
bg-black/30
p-4
rounded-xl
">


<span>
💸 Retraits activés
</span>


<input

type="checkbox"

checked={
settings.withdrawEnabled
}

onChange={(e)=>
change(
"withdrawEnabled",
e.target.checked
)
}


/>


</label>









<label className="
flex
justify-between
bg-black/30
p-4
rounded-xl
text-red-400
">


<span>
🚧 Maintenance
</span>


<input

type="checkbox"

checked={
settings.maintenance
}

onChange={(e)=>
change(
"maintenance",
e.target.checked
)
}


/>


</label>






</div>






</div>









</div>









<button

onClick={save}

disabled={loading}


className="

mt-8

w-full

bg-blue-600

py-4

rounded-xl

font-black

border-b-4

border-blue-900

shadow-[0_6px_0_#172554]

hover:bg-blue-500

active:translate-y-1

active:border-b-0

transition-all

"


>


{

loading

?

"Sauvegarde..."

:

"💾 Sauvegarder les paramètres"

}



</button>








</div>


);



}
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


import {
  motion
} from "framer-motion";


import {
  Settings,
  Save,
  Gamepad2,
  Trophy,
  Percent,
  Coins
} from "lucide-react";





export default function AdminSettingsPage(){


const [settings,setSettings] =
useState<any>({});


const [saving,setSaving] =
useState(false);






useEffect(()=>{


const settingsRef =
ref(
database,
"platform/settings"
);



const unsubscribe =

onValue(
settingsRef,
(snapshot)=>{


setSettings(
snapshot.val() || {

commission:10,

championReward:1000,

adReward:50,

minBet:10,

gameActive:true

}

);


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


setSaving(true);



await update(

ref(
database,
"platform/settings"
),

settings

);



setSaving(false);



}









return(


<div>



<h1

className="

text-2xl

font-black

mb-2

"

>

⚙️ Paramètres Ti Ta To

</h1>



<p

className="

text-gray-400

text-sm

mb-6

"

>

Configuration de la plateforme

</p>









<div

className="

grid

gap-5

"

>





<div

className="

bg-white/10

border

border-white/20

rounded-3xl

p-5

"

>


<Percent/>


<label className="text-sm text-gray-400">
Commission (%)
</label>


<input


type="number"


value={
settings.commission || 0
}


onChange={
e=>

change(
"commission",
Number(e.target.value)
)

}



className="

w-full

mt-2

bg-black/30

rounded-2xl

p-3

"

 />


</div>









<div

className="

bg-white/10

border

border-white/20

rounded-3xl

p-5

"

>


<Trophy/>


<label className="text-sm text-gray-400">
Récompense champion (HTG)
</label>



<input


type="number"


value={
settings.championReward || 0
}


onChange={
e=>

change(
"championReward",
Number(e.target.value)
)

}



className="

w-full

mt-2

bg-black/30

rounded-2xl

p-3

"

 />


</div>









<div

className="

bg-white/10

border

border-white/20

rounded-3xl

p-5

"

>


<Coins/>


<label className="text-sm text-gray-400">
Bonus publicité (HTG)
</label>



<input


type="number"


value={
settings.adReward || 0
}


onChange={
e=>

change(
"adReward",
Number(e.target.value)
)

}



className="

w-full

mt-2

bg-black/30

rounded-2xl

p-3

"

 />


</div>









<div

className="

bg-white/10

border

border-white/20

rounded-3xl

p-5

"

>


<Gamepad2/>


<label className="text-sm text-gray-400">
Mise minimum (HTG)
</label>



<input


type="number"


value={
settings.minBet || 0
}


onChange={
e=>

change(
"minBet",
Number(e.target.value)
)

}



className="

w-full

mt-2

bg-black/30

rounded-2xl

p-3

"

 />


</div>









<div

className="

bg-white/10

border

border-white/20

rounded-3xl

p-5

flex

justify-between

items-center

"

>


<div>


<p className="font-bold">
État du jeu
</p>


<p className="text-xs text-gray-400">
Autoriser les joueurs à jouer
</p>


</div>




<input


type="checkbox"


checked={
settings.gameActive !== false
}



onChange={
e=>

change(
"gameActive",
e.target.checked
)

}



/>



</div>









<motion.button


whileTap={{
scale:0.95
}}



onClick={save}



className="

bg-blue-500

rounded-2xl

py-4

font-black

flex

justify-center

items-center

gap-2

"

>

<Save size={20}/>

{

saving

?

"Sauvegarde..."

:

"Sauvegarder"

}


</motion.button>







</div>





</div>


);


}
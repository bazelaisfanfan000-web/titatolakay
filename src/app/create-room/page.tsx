"use client";

import {
  useState
} from "react";

import {
  useRouter
} from "next/navigation";

import {
  ref,
  push,
  set,
  serverTimestamp
} from "firebase/database";

import {
  database,
  auth
} from "@/lib/firebase";

import {
  checkUserBalance,
  deductBet
} from "@/lib/firebaseEconomy";

import BackButton from "@/components/BackButton";


export default function CreateRoomPage(){

const router = useRouter();


const [name,setName] = useState("");

const [bet,setBet] = useState("");

const [mode,setMode] = useState("1v1");

const [loading,setLoading] = useState(false);

const [error,setError] = useState("");





async function createRoom(){

try{


setError("");


const user = auth.currentUser;



if(!user){

throw new Error(
"Connecte-toi d'abord"
);

}



const betAmount = Number(bet);



if(
!betAmount ||
betAmount <= 0
){

throw new Error(
"Entre une mise valide"
);

}



setLoading(true);





const balance =
await checkUserBalance(
user.uid
);




if(balance < betAmount){

throw new Error(
`Solde insuffisant (${balance} HTG)`
);

}





const roomRef =
push(
ref(database,"rooms")
);



const roomId =
roomRef.key;



if(!roomId){

throw new Error(
"Impossible de créer la partie"
);

}




await deductBet(

user.uid,

betAmount,

roomId

);






const board =

Array.from(

{
length:10
},

()=>Array(10).fill("")

);







await set(

roomRef,

{


name:

name.trim() ||

"Ti Ta To",



gameType:

"titato",



bet:

betAmount,



mode,



type:

"public",



status:

"waiting",



maxPlayers:

mode==="1v1"

?

2

:

4,



playersCount:

1,



creatorId:

user.uid,



pot:

betAmount,



createdAt:

serverTimestamp(),





game:{


board,


turn:"X",


winner:null,


status:"waiting",


turnStartedAt:null,


turnDuration:30,


paymentDone:false


}



}

);







await set(

ref(

database,

`rooms/${roomId}/players/${user.uid}`

),


{


uid:user.uid,


name:

user.displayName ||

"Joueur",



symbol:"X",



ready:true,



betPaid:true,



joinedAt:

serverTimestamp()



}

);






router.push(

`/room/${roomId}`

);





}

catch(err:any){


setError(

err.message ||

"Erreur création"

);


}

finally{


setLoading(false);


}


}







return(


<main

className="
min-h-screen
bg-gradient-to-br
from-[#020617]
via-[#07152f]
to-black
text-white
px-5
pt-16
"


>


<div

className="
max-w-sm
mx-auto
"


>


<div

className="
mb-5
"

>

<BackButton />

</div>







<div

className="
bg-white/10
border
border-white/20
rounded-3xl
p-5
backdrop-blur-xl
shadow-2xl
"


>




<h1

className="
text-2xl
font-black
text-center
mb-5
"


>

🎮 Créer une partie
<br/>


</h1>








<input


value={name}


onChange={

e=>

setName(

e.target.value

)

}


placeholder="Nom de la partie"



className="
w-full
p-3
rounded-xl
bg-black/30
border
border-white/10
outline-none
mb-3
text-white
text-sm
"

/>









<input


type="number"


value={bet}


onChange={

e=>

setBet(

e.target.value

)

}


placeholder="Montant de la mise (HTG)"



className="
w-full
p-3
rounded-xl
bg-black/30
border
border-white/10
outline-none
mb-3
text-white
text-sm
"

/>









<select


value={mode}


onChange={

e=>

setMode(

e.target.value

)

}


className="
w-full
p-3
rounded-xl
bg-black/30
border
border-white/10
outline-none
mb-5
text-sm
"


>


<option value="1v1">

1 VS 1

</option>



<option value="2v2">

2 VS 2

</option>



</select>









<button


onClick={createRoom}


disabled={loading}



className="
w-full
p-3
rounded-xl
bg-blue-600
hover:bg-blue-500
font-black
text-sm
transition
"


>


{

loading

?

"Création..."

:

"Créer une partie"

}



</button>








{

error &&


<p

className="
mt-4
text-red-400
text-xs
text-center
font-bold
"

>


{error}


</p>


}






</div>


</div>


</main>


);


}
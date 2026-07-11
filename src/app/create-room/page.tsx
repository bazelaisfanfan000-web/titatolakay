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
  update,
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





export default function CreateRoomPage(){


const router = useRouter();


const [name,setName] =
useState("");


const [bet,setBet] =
useState("50");


const [mode,setMode] =
useState("1v1");


const [type,setType] =
useState("public");


const [loading,setLoading] =
useState(false);


const [error,setError] =
useState("");







async function createRoom(){


try{


setError("");



const user = auth.currentUser;



if(!user){

throw new Error(
"Connecte-toi d'abord"
);

}




const betAmount =
Number(bet);



if(
betAmount <= 0
){

throw new Error(
"Mise invalide"
);

}






const balance =
await checkUserBalance(
user.uid
);




console.log("💰 VERIFICATION SOLDE:");
console.log("Solde actuel:", balance, "HTG");
console.log("Mise demandée:", betAmount, "HTG");




if(balance < betAmount){

throw new Error(
`Solde insuffisant (${balance} HTG)`
);

}





setLoading(true);






// créer salle

const roomRef =
push(
ref(database,"rooms")
);



const roomId =
roomRef.key;



if(!roomId){

throw new Error(
"Erreur création salle"
);

}







// retirer la mise UNE SEULE FOIS

await deductBet(

user.uid,

betAmount,

roomId

);









// créer room

await set(

roomRef,

{


name:
name || "Ti Ta To",


game:
"titato",


bet:
betAmount,


mode,


type,


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
Math.floor(betAmount),



createdAt:
serverTimestamp()



}

);








// ajouter joueur créateur

await set(

ref(

database,

`rooms/${roomId}/players/${user.uid}`

),

{


uid:user.uid,


name:
user.displayName || "Joueur",


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


console.log(err);


setError(
err.message || "Erreur"
);


}
finally{


setLoading(false);


}



}









return(

<main className="
min-h-screen
bg-black
text-white
flex
items-center
justify-center
p-4
">


<div className="
w-full
max-w-md
bg-white/10
rounded-3xl
p-6
">


<h1 className="
text-2xl
font-bold
text-center
mb-6
">

🎮 Créer une partie

</h1>




{
error &&

<div className="
bg-red-500/20
p-3
rounded-xl
mb-4
text-red-400
">

{error}

</div>

}






<input

placeholder="Nom de partie"

value={name}

onChange={(e)=>setName(e.target.value)}

className="
w-full
p-3
rounded-xl
bg-black
border
mb-4
"

/>






<input

type="number"

value={bet}

onChange={(e)=>setBet(e.target.value)}

className="
w-full
p-3
rounded-xl
bg-black
border
mb-4
"

/>






<select

value={mode}

onChange={(e)=>setMode(e.target.value)}

className="
w-full
p-3
rounded-xl
bg-black
border
mb-4
">

<option value="1v1">
👥 1 VS 1
</option>


<option value="2v2">
👥 2 VS 2
</option>


</select>






<select

value={type}

onChange={(e)=>setType(e.target.value)}

className="
w-full
p-3
rounded-xl
bg-black
border
mb-5
">

<option value="public">
🌍 Public
</option>


<option value="private">
🔒 Privé
</option>


</select>







<button

disabled={loading}

onClick={createRoom}

className="
w-full
bg-blue-600
py-3
rounded-xl
font-bold
">


{
loading
?
"Création..."
:
"🚀 Créer"
}



</button>



</div>


</main>


);


}
"use client";


import { useState } from "react";
import { useRouter } from "next/navigation";


import { 
  auth,
  database
} from "../../lib/firebase";


import {
  createUserWithEmailAndPassword
} from "firebase/auth";


import {
  ref,
  set,
  push
} from "firebase/database";




export default function Register(){



const router = useRouter();



const [username,setUsername] = useState("");

const [email,setEmail] = useState("");

const [password,setPassword] = useState("");



const [error,setError] = useState("");

const [loading,setLoading] = useState(false);







async function register(){



if(!username || !email || !password){


setError(
"Tous les champs sont obligatoires"
);


return;


}






if(password.length < 6){


setError(
"Le mot de passe doit avoir au moins 6 caractères"
);


return;


}






try{


setLoading(true);

setError("");





// CREATION COMPTE FIREBASE AUTH


const result = await createUserWithEmailAndPassword(

auth,

email,

password

);



const user = result.user;



const uid = user.uid;






// CREATION PROFIL JOUEUR + BONUS 1000 HTG


await set(

ref(database,"users/"+uid),

{


uid:uid,


username:username,


email:email,


balance:1000,


currency:"HTG",


createdAt:Date.now(),


lastBonus:Date.now()


}


);








// CREATION NOTIFICATION BONUS


const notificationRef = push(

ref(database,"notifications/"+uid)

);





await set(

notificationRef,

{


title:"🎁 Bonus de bienvenue",


message:
"Tu as reçu +1000 HTG pour commencer à jouer sur Domino Lakay.",


amount:1000,


type:"bonus",


read:false,


createdAt:Date.now()



}

);







router.push("/dashboard");





}

catch(err:any){



console.log(err);




if(err.code==="auth/email-already-in-use"){


setError(
"Cet email existe déjà"
);


}


else if(err.code==="auth/invalid-email"){


setError(
"Email invalide"
);


}


else{


setError(
err.message
);


}



}



finally{


setLoading(false);


}



}











return(


<main

className="
min-h-screen
bg-[#050505]
text-white
flex
items-center
justify-center
px-5
"

>



<div

className="
w-full
max-w-sm
bg-white/5
border
border-white/10
backdrop-blur-xl
rounded-3xl
p-6
shadow-2xl
"

>






<h1

className="
text-3xl
font-black
text-center
"

>

🎲 DOMINOS HAÏTI

</h1>





<p

className="
text-center
text-gray-400
mt-2
"

>

Créer un compte joueur

</p>









<input


className="
w-full
mt-6
p-3
rounded-xl
bg-black/40
border
border-white/10
outline-none
"


placeholder="Nom joueur"


value={username}


onChange={(e)=>setUsername(e.target.value)}


/>









<input


className="
w-full
mt-3
p-3
rounded-xl
bg-black/40
border
border-white/10
outline-none
"


placeholder="Email"


type="email"


value={email}


onChange={(e)=>setEmail(e.target.value)}


/>









<input


className="
w-full
mt-3
p-3
rounded-xl
bg-black/40
border
border-white/10
outline-none
"


placeholder="Mot de passe"


type="password"


value={password}


onChange={(e)=>setPassword(e.target.value)}


/>









{

error &&


<p

className="
text-red-500
text-sm
mt-4
text-center
"

>

{error}

</p>


}









<button


onClick={register}


disabled={loading}



className="
w-full
mt-5
py-3
rounded-xl
bg-blue-600
font-bold
hover:scale-105
transition
disabled:opacity-50
"

>


{

loading

?

"Création du compte..."

:

"Créer mon compte"

}



</button>








<p

className="
text-center
text-gray-500
text-xs
mt-5
"

>

🎁 Nouveau joueur reçoit automatiquement 1000 HTG

</p>








</div>


</main>


)


}
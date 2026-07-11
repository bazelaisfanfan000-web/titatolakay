"use client";


import { useState } from "react";
import { useRouter } from "next/navigation";

import { auth } from "../../lib/firebase";

import {
  signInWithEmailAndPassword
} from "firebase/auth";



export default function Login(){


const router = useRouter();


const [email,setEmail] = useState("");

const [password,setPassword] = useState("");

const [error,setError] = useState("");

const [loading,setLoading] = useState(false);





async function login(){


if(!email || !password){

setError("Remplis tous les champs ❌");

return;

}



try{


setLoading(true);

setError("");



await signInWithEmailAndPassword(

auth,

email,

password

);



router.push("/dashboard");



}

catch(err:any){



console.log(err);



if(err.code === "auth/invalid-credential"){

setError(
"Email ou mot de passe incorrect ❌"
);

}

else if(err.code === "auth/user-not-found"){

setError(
"Ce compte n'existe pas ❌"
);

}

else if(err.code === "auth/wrong-password"){

setError(
"Mot de passe incorrect ❌"
);

}

else if(err.code === "auth/invalid-email"){

setError(
"Email invalide ❌"
);

}

else{

setError(
"Une erreur est survenue ❌"
);

}



}

finally{


setLoading(false);


}


}








return(

<main className="
min-h-screen
bg-[#050505]
text-white
flex
items-center
justify-center
px-5
">


<div className="
w-full
max-w-sm
bg-white/5
border
border-white/10
backdrop-blur-xl
rounded-3xl
p-6
">



<h1 className="
text-3xl
font-black
text-center
">

🎲 DOMINOS HAÏTI

</h1>



<p className="
text-center
text-gray-400
mt-2
">

Connexion

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
text-sm
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
text-sm
outline-none
"

placeholder="Mot de passe"

type="password"

value={password}

onChange={(e)=>setPassword(e.target.value)}

/>







{
error &&

<p className="
text-red-500
text-xs
mt-3
text-center
font-bold
">

{error}

</p>

}







<button

onClick={login}

disabled={loading}

className="
w-full
mt-5
py-3
rounded-xl
bg-blue-600
font-bold
text-sm
"

>


{

loading

?

"Connexion..."

:

"Se connecter"

}


</button>






</div>


</main>

)

}
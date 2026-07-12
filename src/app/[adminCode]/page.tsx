"use client";

import {
  useParams,
  useRouter
} from "next/navigation";

import {
  useState
} from "react";

import {
  ShieldCheck,
  Lock,
  Crown,
  ArrowRight
} from "lucide-react";


export default function AdminCodePage(){


const router = useRouter();

const params = useParams();


const adminCode =
params.adminCode as string;


const SECRET_URL = "123456789";


const [password,setPassword] =
useState("");

const [error,setError] =
useState("");

const [loading,setLoading] =
useState(false);





function enter(){


setError("");

setLoading(true);



if(password === "30Decembre2009"){


localStorage.setItem(
"adminAccess",
"true"
);


router.push("/admin");


}else{


setError(
"Mot de passe incorrect"
);


}


setLoading(false);


}






if(adminCode !== SECRET_URL){


return(

<div className="
min-h-screen
bg-[#050816]
flex
items-center
justify-center
p-5
text-white
">


<div className="
bg-[#111827]
border
border-red-500/30
rounded-3xl
p-8
text-center
">


<h1 className="
text-3xl
font-black
">

❌ Accès refusé

</h1>


<p className="
text-gray-400
mt-3
">

Page protégée

</p>


</div>


</div>

);


}





return(

<div className="
min-h-screen
bg-[#050816]
flex
items-center
justify-center
p-5
text-white
">



<div className="
w-full
max-w-md
bg-[#0D1224]
border
border-white/10
rounded-3xl
p-8
shadow-2xl
">






<div className="
flex
justify-center
">


<div className="
w-24
h-24
rounded-full
bg-blue-600/20
flex
items-center
justify-center
border
border-blue-500/30
shadow-lg
">


<Crown
size={45}
className="
text-yellow-400
"/>


</div>


</div>






<h1 className="
text-center
text-3xl
font-black
mt-6
">

DOMINOS HAÏTI

</h1>



<p className="
text-center
text-gray-400
mt-2
">

Administration sécurisée

</p>








<div className="
mt-8
">


<label className="
text-gray-400
text-sm
">

Code administrateur

</label>



<div className="
mt-2
flex
items-center
bg-black
border
border-white/20
rounded-xl
px-4
">


<Lock
size={20}
className="
text-blue-400
"/>



<input

type="password"

value={password}

onChange={(e)=>
setPassword(e.target.value)
}

placeholder="Entrer votre code"

className="
w-full
bg-transparent
outline-none
p-4
text-white
"

/>


</div>


</div>









{/* BOUTON 3D */}


<button

onClick={enter}

disabled={loading}

className="

mt-6

w-full

bg-blue-600

text-white

py-4

rounded-xl

font-black

text-lg

border-b-4

border-blue-900

shadow-[0_8px_0_#172554]

hover:bg-blue-500

active:border-b-0

active:translate-y-2

transition-all

flex

items-center

justify-center

gap-3

"


>


{

loading

?

"Vérification..."

:

<>

Entrer dans Admin

<ArrowRight size={22}/>

</>

}


</button>









{

error &&

<div className="
mt-5
bg-red-500/10
border
border-red-500/30
rounded-xl
p-3
text-center
text-red-400
">

❌ {error}

</div>

}








<div className="
mt-8
text-center
text-xs
text-gray-500
">


<ShieldCheck
size={16}
className="
inline
mr-2
text-green-400
"/>


Accès administrateur protégé


</div>







</div>



</div>


);


}
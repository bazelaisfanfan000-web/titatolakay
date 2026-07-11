"use client";

import {
  useRouter
} from "next/navigation";


export default function Home(){


const router = useRouter();



return (

<main
className="
min-h-screen
bg-[#050505]
text-white
flex
items-center
justify-center
px-6
"
>


<div
className="
w-full
max-w-sm
text-center
"
>


<h1
className="
text-5xl
font-black
text-blue-500
mb-4
"
>
⭕ TI TA TO
</h1>



<p
className="
text-gray-400
text-sm
mb-10
"
>
Joue, gagne et défie tes amis 🎮
</p>





<button

onClick={() => router.push("/register")}

className="
w-full
py-4
rounded-2xl
bg-blue-600
font-bold
text-lg
mb-4
"

>

🚀 Créer un compte

</button>





<button

onClick={() => router.push("/login")}

className="
w-full
py-4
rounded-2xl
bg-white/10
border
border-white/20
font-bold
text-lg
"

>

🔐 Connexion

</button>





<p
className="
mt-8
text-xs
text-gray-500
"
>

Version bêta 🧪

</p>



</div>


</main>

);

}
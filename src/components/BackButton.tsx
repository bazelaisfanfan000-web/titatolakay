"use client";

import {
  useRouter
} from "next/navigation";


export default function BackButton(){


const router = useRouter();


return(

<button

onClick={()=>router.back()}

className="
mb-5
bg-white/10
border
border-white/20
backdrop-blur-xl
px-4
py-2
rounded-xl
text-sm
text-gray-300
active:scale-95
transition
"

>

← Retour

</button>

);


}
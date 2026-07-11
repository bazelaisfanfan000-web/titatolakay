"use client";


import useAdmin from "@/hooks/useAdmin";


export default function AdminLayout({

children

}:{

children:React.ReactNode

}){


const {

isAdmin,

loading

}=useAdmin();



if(loading){

return(

<div className="
min-h-screen
bg-black
text-white
flex
items-center
justify-center
">

🔐 Vérification accès admin...

</div>

);

}



if(!isAdmin){

return(

<div className="
min-h-screen
bg-black
text-white
flex
items-center
justify-center
">

❌ Accès refusé

</div>

);

}



return(

<>

{children}

</>

);


}
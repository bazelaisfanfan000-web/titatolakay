"use client";

import {
  useEffect,
  useState
} from "react";


import {
  motion
} from "framer-motion";


import {
  useRouter
} from "next/navigation";


import {
  auth,
  database
} from "@/lib/firebase";


import {
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut
} from "firebase/auth";


import {
  ref,
  onValue,
  update
} from "firebase/database";


import {
  useLanguage
} from "@/context/LanguageContext";


import BackButton from "@/components/BackButton";



export default function SettingsPage(){


const router = useRouter();



const {
language,
setLanguage,
t
}=useLanguage();




const [uid,setUid]=useState("");

const [username,setUsername]=useState("Joueur");

const [newUsername,setNewUsername]=useState("");

const [oldPassword,setOldPassword]=useState("");

const [newPassword,setNewPassword]=useState("");

const [showProfile,setShowProfile]=useState(false);

const [showPassword,setShowPassword]=useState(false);

const [notifications,setNotifications]=useState(true);

const [message,setMessage]=useState("");

const [confirmLogout,setConfirmLogout]=useState(false);





useEffect(()=>{


const unsub = onAuthStateChanged(

auth,

(user)=>{


if(!user){

router.replace("/login");

return;

}



setUid(user.uid);




const userRef = ref(

database,

`users/${user.uid}`

);



const stop = onValue(

userRef,

(snapshot)=>{


const data=snapshot.val();



if(data){


setUsername(

data.username || "Joueur"

);



setNotifications(

data.notificationsEnabled ?? true

);



if(data.language){

setLanguage(

data.language

);

}


}


}

);



return ()=>stop();


}

);



return ()=>unsub();



},[router,setLanguage]);async function saveProfile(){


if(!newUsername.trim()){

setMessage("Nom obligatoire");

return;

}



await update(

ref(

database,

`users/${uid}`

),

{

username:newUsername.trim()

}

);



setUsername(newUsername.trim());

setNewUsername("");

setShowProfile(false);


setMessage(

"Profil modifié ✅"

);


}









async function changePassword(){


try{


const user = auth.currentUser;



if(!user || !user.email){

setMessage(
"Compte sans email"
);

return;

}



if(!oldPassword || !newPassword){

setMessage(
"Remplir tous les champs"
);

return;

}




const credential =

EmailAuthProvider.credential(

user.email,

oldPassword

);





await reauthenticateWithCredential(

user,

credential

);





await updatePassword(

user,

newPassword

);




setOldPassword("");

setNewPassword("");

setShowPassword(false);



setMessage(

"Mot de passe modifié ✅"

);



}

catch(error:any){


console.log(error);



if(error.code==="auth/wrong-password"
||
error.code==="auth/invalid-credential"){


setMessage(

"Ancien mot de passe incorrect"

);


}

else{


setMessage(

"Erreur modification mot de passe"

);


}



}



}









async function saveNotifications(value:boolean){



setNotifications(value);



await update(

ref(

database,

`users/${uid}`

),

{

notificationsEnabled:value

}

);



}









async function saveLanguage(value:"fr"|"ht"){



setLanguage(value);



await update(

ref(

database,

`users/${uid}`

),

{

language:value

}

);



}









async function logout(){


try{


await signOut(auth);



router.replace("/login");



}

catch(error){


console.log(error);


setMessage(

"Erreur de déconnexion"

);


}


}









return (


<main className="
min-h-screen
bg-gradient-to-br
from-[#020617]
via-[#07152f]
to-black
text-white
px-4
py-10
">



<div className="
max-w-xs
mx-auto
">



<BackButton />




<h1 className="
text-xl
font-black
text-center
mb-8
text-blue-400
">


⚙️ {t.settings}


</h1>






<div className="
bg-white/10
border
border-white/20
rounded-3xl
p-5
">


<h2 className="font-bold mb-4">

{t.profile}

</h2>




<p className="
text-gray-300
text-sm
mb-4
">

👤 {username}

</p>





<button

onClick={()=>setShowProfile(true)}

className="
w-full
py-3
rounded-xl
font-black
bg-gradient-to-b
from-cyan-300
via-blue-500
to-blue-800
border
border-blue-300/50
shadow-[0_6px_0_#082f75]
"

>

✏️ {t.editProfile}

</button>



</div>









<div className="
mt-5
bg-white/10
border
border-white/20
rounded-3xl
p-5
">



<h2 className="font-bold mb-4">

🔐 {t.security}

</h2>





<button

onClick={()=>setShowPassword(true)}

className="
w-full
py-3
rounded-xl
font-black
bg-gradient-to-b
from-purple-300
via-purple-500
to-purple-800
border
border-purple-300/50
shadow-[0_6px_0_#4c1d95]
"

>


🔑 {t.changePassword}


</button>



</div><div className="
mt-5
bg-white/10
border
border-white/20
rounded-3xl
p-5
">


<h2 className="font-bold mb-4">

⚙️ Préférences

</h2>




<div className="
flex
justify-between
items-center
mb-4
">


<span>

🔔 Notifications

</span>




<button

onClick={()=>saveNotifications(!notifications)}

className="
bg-blue-600
px-4
py-1
rounded-full
text-xs
"

>

{

notifications

?

t.notificationsOn

:

t.notificationsOff

}


</button>


</div>







<select

value={language}

onChange={(e)=>

saveLanguage(

e.target.value as "fr"|"ht"

)

}

className="
w-full
bg-black/30
p-3
rounded-xl
"

>


<option value="fr">

🇫🇷 Français

</option>



<option value="ht">

🇭🇹 Kreyòl

</option>



</select>



</div>








<motion.button

whileTap={{
scale:.95
}}

onClick={()=>setConfirmLogout(true)}

className="
mt-5
w-full
py-3
rounded-xl
font-black
bg-gradient-to-b
from-red-400
via-red-600
to-red-900
shadow-[0_6px_0_#450a0a]
"

>

🚪 {t.logout}

</motion.button>







{/* MODIFIER PROFIL */}


{

showProfile &&


<div className="
fixed
inset-0
bg-black/70
flex
items-center
justify-center
z-50
p-4
">


<div className="
bg-[#07152f]
border
border-white/20
rounded-3xl
p-6
w-full
max-w-sm
">


<h2 className="
font-black
text-xl
mb-5
text-center
">

✏️ Modifier profil

</h2>



<input

value={newUsername}

onChange={(e)=>

setNewUsername(e.target.value)

}

placeholder="Nouveau nom"

className="
w-full
bg-black/30
border
border-white/20
rounded-xl
p-3
mb-4
"

/>



<button

onClick={saveProfile}

className="
w-full
bg-blue-600
py-3
rounded-xl
font-bold
mb-3
"

>

Enregistrer

</button>




<button

onClick={()=>setShowProfile(false)}

className="
w-full
bg-white/10
py-3
rounded-xl
font-bold
"

>

Annuler

</button>



</div>


</div>


}









{/* CHANGER MOT DE PASSE */}


{

showPassword &&


<div className="
fixed
inset-0
bg-black/70
flex
items-center
justify-center
z-50
p-4
">


<div className="
bg-[#07152f]
border
border-white/20
rounded-3xl
p-6
w-full
max-w-sm
">



<h2 className="
font-black
text-xl
mb-5
text-center
">

🔑 Nouveau mot de passe

</h2>




<input

type="password"

value={oldPassword}

onChange={(e)=>

setOldPassword(e.target.value)

}

placeholder="Ancien mot de passe"

className="
w-full
bg-black/30
border
border-white/20
rounded-xl
p-3
mb-3
"

/>





<input

type="password"

value={newPassword}

onChange={(e)=>

setNewPassword(e.target.value)

}

placeholder="Nouveau mot de passe"

className="
w-full
bg-black/30
border
border-white/20
rounded-xl
p-3
mb-4
"

/>






<button

onClick={changePassword}

className="
w-full
bg-purple-600
py-3
rounded-xl
font-bold
mb-3
"

>

Modifier

</button>





<button

onClick={()=>setShowPassword(false)}

className="
w-full
bg-white/10
py-3
rounded-xl
font-bold
"

>

Annuler

</button>




</div>


</div>


}









{/* CONFIRMATION DECONNEXION */}


{

confirmLogout &&


<div className="
fixed
inset-0
bg-black/70
flex
items-center
justify-center
z-50
p-4
">


<div className="
bg-[#07152f]
border
border-white/20
rounded-3xl
p-6
w-full
max-w-sm
text-center
">



<h2 className="
text-xl
font-black
mb-4
">

🚪 Déconnexion ?

</h2>



<p className="
text-gray-300
mb-6
">

Voulez-vous quitter votre compte ?

</p>




<div className="
flex
gap-3
">


<button

onClick={()=>setConfirmLogout(false)}

className="
flex-1
bg-white/10
py-3
rounded-xl
font-bold
"

>

Annuler

</button>




<button

onClick={logout}

className="
flex-1
bg-red-600
py-3
rounded-xl
font-bold
"

>

Quitter

</button>



</div>



</div>


</div>


}









{

message &&


<div className="
fixed
bottom-8
left-1/2
-translate-x-1/2
bg-[#07152f]
border
border-white/20
p-4
rounded-2xl
z-50
text-center
">


{message}



<button

onClick={()=>setMessage("")}

className="
block
text-blue-400
text-xs
mt-2
mx-auto
"

>

OK

</button>


</div>


}



</div>


</main>


);


}
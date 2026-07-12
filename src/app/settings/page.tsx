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

router.push("/login");

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



return()=>stop();



}

);



return()=>unsub();



},[router,setLanguage]);








async function saveProfile(){


if(!newUsername){

setMessage("Nom obligatoire");

return;

}



await update(

ref(
database,
`users/${uid}`
),

{

username:newUsername

}

);



setUsername(newUsername);

setNewUsername("");

setShowProfile(false);

setMessage("Profil modifié ✅");

}





async function changePassword(){


try{


const user=auth.currentUser;


if(!user || !user.email)
return;



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

catch{


setMessage(
"Ancien mot de passe incorrect"
);


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


await signOut(auth);

router.push("/login");


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



<p className="text-gray-300 text-sm mb-4">

👤 {username}

</p>



<button

onClick={()=>setShowProfile(true)}

className="
w-full
py-3
rounded-xl
bg-blue-600
font-bold
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
bg-white/20
"

>

🔑 {t.changePassword}

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
bg-red-600
font-bold
"

>

🚪 {t.logout}

</motion.button>







{
message &&

<div className="
fixed
bottom-8
left-1/2
-translate-x-1/2
bg-[#07152f]
p-4
rounded-2xl
z-50
">


{message}



<button

onClick={()=>setMessage("")}

className="
block
text-blue-400
text-xs
mt-2
"

>

OK

</button>


</div>

}









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
">


<div className="
bg-[#07152f]
p-5
rounded-3xl
w-80
">


<h2 className="font-bold mb-4">

Modifier profil

</h2>



<input

value={newUsername}

onChange={(e)=>setNewUsername(e.target.value)}

placeholder="Nouveau nom"

className="
w-full
p-3
bg-black/30
rounded-xl
"

/>



<button

onClick={saveProfile}

className="
mt-4
w-full
bg-blue-600
py-3
rounded-xl
"

>

Sauvegarder

</button>



</div>

</div>

}







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
">


<div className="
bg-[#07152f]
p-5
rounded-3xl
w-80
">


<input

type="password"

placeholder="Ancien mot de passe"

value={oldPassword}

onChange={(e)=>setOldPassword(e.target.value)}

className="
w-full
p-3
bg-black/30
rounded-xl
mb-3
"

/>



<input

type="password"

placeholder="Nouveau mot de passe"

value={newPassword}

onChange={(e)=>setNewPassword(e.target.value)}

className="
w-full
p-3
bg-black/30
rounded-xl
"

/>



<button

onClick={changePassword}

className="
mt-4
w-full
bg-blue-600
py-3
rounded-xl
"

>

Changer

</button>



</div>

</div>

}







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
">


<div className="
bg-[#07152f]
p-5
rounded-3xl
text-center
">


<h2 className="font-bold">

🚪 {t.logout}

</h2>


<button

onClick={logout}

className="
mt-4
bg-red-600
px-6
py-3
rounded-xl
"

>

Oui

</button>



</div>

</div>

}



</div>


</main>


);


}
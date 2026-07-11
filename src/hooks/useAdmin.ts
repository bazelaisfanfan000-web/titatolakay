"use client";


import {
  useEffect,
  useState
} from "react";


import {
  auth,
  database
} from "@/lib/firebase";


import {
  onAuthStateChanged
} from "firebase/auth";


import {
  ref,
  get
} from "firebase/database";



export default function useAdmin(){


const [
  isAdmin,
  setIsAdmin
] = useState(false);



const [
  loading,
  setLoading
] = useState(true);





useEffect(()=>{


const checkAdmin = async()=>{


// Vérification du passage par la page secrète

const adminAccess =

localStorage.getItem(
"adminAccess"
);



if(adminAccess === "true"){


setIsAdmin(true);

setLoading(false);


return;


}




const unsubscribe =

onAuthStateChanged(

auth,

async(user)=>{


if(!user){


setIsAdmin(false);

setLoading(false);

return;


}





try{


const snapshot = await get(


ref(

database,

`users/${user.uid}`

)


);



const data = snapshot.val();





if(data?.role === "admin"){


setIsAdmin(true);


}

else{


setIsAdmin(false);


}




}

catch(error){


console.log(
"Erreur vérification admin",
error
);


setIsAdmin(false);


}



setLoading(false);



}


);



return unsubscribe;



};




checkAdmin();



},[]);





return {

isAdmin,

loading

};



}
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


// Vérifier le cookie admin_session
const checkCookie = async () => {
  try {
    const response = await fetch('/api/admin/verify-session');
    const data = await response.json();
    return data.valid;
  } catch (error) {
    console.error("Erreur vérification cookie:", error);
    return false;
  }
};

const hasValidCookie = await checkCookie();

if (hasValidCookie) {
  setIsAdmin(true);
  setLoading(false);
  return;
}

// Fallback: Vérification du localStorage
const adminAccess = localStorage.getItem("adminAccess");

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
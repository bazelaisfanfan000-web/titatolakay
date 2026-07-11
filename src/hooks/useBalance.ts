"use client";

import {
  useEffect,
  useState
} from "react";

import {
  ref,
  onValue
} from "firebase/database";

import {
  auth,
  database
} from "@/lib/firebase";

import {
  onAuthStateChanged
} from "firebase/auth";



export function useBalance(){


const [balance,setBalance] = useState<number>(0);

const [loading,setLoading] = useState(true);



useEffect(()=>{


const unsubscribeAuth =
onAuthStateChanged(auth,(user)=>{


if(!user){

console.log("useBalance: Aucun utilisateur connecté");
setBalance(0);
setLoading(false);

return;

}



console.log("useBalance: USER UID:", user.uid);


const balanceRef = ref(

database,

`users/${user.uid}/balance`

);




const unsubscribeBalance =
onValue(

balanceRef,

(snapshot)=>{


const value =
snapshot.val();



console.log("useBalance: BALANCE FIREBASE:", value);


setBalance(
Math.floor(
Number(value || 0)
)
);


setLoading(false);



}



);




return ()=>unsubscribeBalance();



});



return ()=>unsubscribeAuth();



},[]);



return {

balance,

loading

};


}

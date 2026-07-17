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
  onValue
} from "firebase/database";


export function useBalance(){


const [balance,setBalance] =
useState(0);


const [loading,setLoading] =
useState(true);



useEffect(()=>{


let unsubscribeBalance:any;


const unsubscribeAuth =
onAuthStateChanged(
auth,
(user)=>{


if(!user){

setBalance(0);
setLoading(false);

return;

}




const balanceRef =
ref(
database,
`users/${user.uid}/balance`
);



unsubscribeBalance =
onValue(

balanceRef,

(snapshot)=>{


const value =
snapshot.val();



console.log(
"💰 DASHBOARD BALANCE",
value
);



setBalance(
Number(value || 0)
);



setLoading(false);


}


);



}

);



return()=>{


unsubscribeAuth();


if(unsubscribeBalance){

unsubscribeBalance();

}


};



},[]);



return {

balance,

loading

};


}
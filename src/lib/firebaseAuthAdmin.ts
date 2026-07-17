import {
  getAuth
} from "firebase-admin/auth";


import {
  getApps
} from "firebase-admin/app";


if(!getApps().length){
  throw new Error(
    "Firebase Admin non initialisé"
  );
}


export const adminAuth =
getAuth(
  getApps()[0]
);
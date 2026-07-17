import {
  getAuth
} from "firebase-admin/auth";

import {
  getApps
} from "firebase-admin/app";


export const adminAuth =
getAuth(
  getApps()[0]
);
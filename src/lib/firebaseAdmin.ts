import {initializeApp,cert,getApps} from "firebase-admin/app";
import {getDatabase} from "firebase-admin/database";
import {getAuth} from "firebase-admin/auth";


let adminDB: any = null;
let adminAuth: any = null;





function getAdminDB(){

  if(!adminDB){

    const firebaseAdminConfig = {

      projectId:
        process.env.FIREBASE_PROJECT_ID,

      clientEmail:
        process.env.FIREBASE_CLIENT_EMAIL,

      privateKey:
        process.env.FIREBASE_PRIVATE_KEY
          ?.replace(/\\n/g, "\n"),

    };





    const existingApps =
    getApps();





    let app: any;

    if(
      existingApps.length === 0
    ){

      app = initializeApp({

        credential:
          cert(
            firebaseAdminConfig as any
          ),

        databaseURL:
          process.env.FIREBASE_DATABASE_URL ||
          "https://domino-fad16-default-rtdb.firebaseio.com"

      });

    }
    else{

      app = existingApps[0];

    }





    adminDB =
    getDatabase(app);





    adminAuth =
    getAuth(app);





  }





  return adminDB;

}





function getAdminAuth(){

  if(!adminAuth){

    getAdminDB();

  }





  return adminAuth;

}





export {

  getAdminDB as adminDB,

  getAdminAuth as adminAuth

};

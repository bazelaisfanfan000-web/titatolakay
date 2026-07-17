export async function addPlayerWin(
  uid?:string
){

console.log(
 "WIN",
 uid
);


return {
 success:true
};

}




export async function addPlayerLose(
  uid?:string
){

console.log(
 "LOSE",
 uid
);


return {
 success:true
};

}
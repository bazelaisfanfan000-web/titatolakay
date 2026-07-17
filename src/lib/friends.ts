export async function sendFriendRequest(
  fromUid:string,
  toUid:string
){

  console.log(
    "friend request",
    fromUid,
    toUid
  );

  return true;

}



export async function checkFriendStatus(
  userUid:string,
  friendUid:string
){

  console.log(
    "check friend",
    userUid,
    friendUid
  );


  return false;

}
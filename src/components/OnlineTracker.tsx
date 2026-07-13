"use client";

import {
  useOnlineStatus
} from "@/hooks/useOnlineStatus";


export default function OnlineTracker(){

  useOnlineStatus();

  return null;

}
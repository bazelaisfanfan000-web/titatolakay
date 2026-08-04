"use client";

import {
  useEffect,
  useState,
  useCallback,
} from "react";

import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import {
  get,
  onValue,
  ref,
} from "firebase/database";

import {
  auth,
  database,
} from "@/lib/firebase";

import {
  acceptVyloFriendRequest,
  rejectVyloFriendRequest,
  listenToVyloFriendRequests,
  type VyloFriendRequest,
} from "@/lib/vylo/vyloFriends";


/*
========================================
TYPES
========================================
*/

type VyloFriend = {
  id: string;
  userId: string;
  friendId: string;
  createdAt: number;
  status: string;
};


type UserProfile = {
  uid?: string;
  username?: string;
  email?: string;
  online?: boolean;
  lastSeen?: number;
  language?: string;
};


type ChatMessage = {
  id: string;
  senderId?: string;
  receiverId?: string;
  text?: string;
  createdAt?: number;
};


type TabType =
  | "friends"
  | "requests"
  | "explore"; // NOUVEAU


type SearchResult = {
  uid: string;
  username: string;
  email: string;
  online: boolean;
  isFriend: boolean;
  requestPending: boolean;
  requestReceived: boolean; // si l'autre t'a déjà envoyé une demande
};


/*
========================================
PAGE VYLO
========================================
*/

export default function VyloPage() {

  /*
  ======================================
  AUTH
  ======================================
  */

  const [
    currentUser,
    setCurrentUser,
  ] = useState<User | null>(null);


  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);


  /*
  ======================================
  TAB
  ======================================
  */

  const [
    activeTab,
    setActiveTab,
  ] = useState<TabType>(
    "friends"
  );


  /*
  ======================================
  DEMANDES
  ======================================
  */

  const [
    requests,
    setRequests,
  ] = useState<
    VyloFriendRequest[]
  >([]);


  /*
  ======================================
  AMIS
  ======================================
  */

  const [
    friends,
    setFriends,
  ] = useState<
    VyloFriend[]
  >([]);


  /*
  ======================================
  PROFILS
  ======================================
  */

  const [
    profiles,
    setProfiles,
  ] = useState<
    Record<
      string,
      UserProfile
    >
  >({});


  /*
  ======================================
  DERNIERS MESSAGES
  ======================================
  */

  const [
    lastMessages,
    setLastMessages,
  ] = useState<
    Record<
      string,
      string
    >
  >({});


  /*
  ======================================
  CHARGEMENT DERNIERS MESSAGES
  ======================================
  */

  const [
    lastMessagesLoading,
    setLastMessagesLoading,
  ] = useState<
    Record<
      string,
      boolean
    >
  >({});


  /*
  ======================================
  LOADING
  ======================================
  */

  const [
    loading,
    setLoading,
  ] = useState(false);


  /*
  ======================================
  ACTION
  ======================================
  */

  const [
    processingId,
    setProcessingId,
  ] = useState<
    string | null
  >(null);


  /*
  ======================================
  ERREUR
  ======================================
  */

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);


  // =====================================
  // NOUVEAU : ÉTATS POUR LA RECHERCHE
  // =====================================

  const [
    searchQuery,
    setSearchQuery,
  ] = useState<string>("");

  const [
    searchResults,
    setSearchResults,
  ] = useState<SearchResult[]>([]);

  const [
    searchLoading,
    setSearchLoading,
  ] = useState<boolean>(false);

  const [
    searchError,
    setSearchError,
  ] = useState<string | null>(null);


  /*
  ======================================
  AUTH STATE
  ======================================
  */

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {

          setCurrentUser(
            user
          );

          setAuthLoading(
            false
          );

        }
      );


    return () => {

      unsubscribe();

    };

  }, []);


  /*
  ======================================
  DEMANDES EN TEMPS RÉEL
  ======================================
  */

  useEffect(() => {

    if (
      authLoading
    ) {

      return;

    }


    if (
      !currentUser
    ) {

      setRequests([]);

      return;

    }


    setError(null);


    const unsubscribe =
      listenToVyloFriendRequests(
        currentUser.uid,
        (
          newRequests
        ) => {

          setRequests(
            newRequests
          );

        }
      );


    return () => {

      unsubscribe();

    };

  }, [
    currentUser,
    authLoading,
  ]);


  /*
  ======================================
  AMIS EN TEMPS RÉEL
  ======================================
  */

  useEffect(() => {

    if (
      authLoading
    ) {

      return;

    }


    if (
      !currentUser
    ) {

      setFriends([]);

      setLoading(false);

      return;

    }


    setLoading(true);

    setError(null);


    const friendsRef =
      ref(
        database,
        `vylo/friendships/${currentUser.uid}`
      );


    const unsubscribe =
      onValue(
        friendsRef,
        (snapshot) => {

          const data =
            snapshot.val();


          if (!data) {

            setFriends([]);

            setLoading(false);

            return;

          }


          const result:
            VyloFriend[] = [];


          Object.entries(
            data
          ).forEach(
            ([
              friendId,
              value,
            ]) => {

              const friendship =
                value as Partial<VyloFriend>;


              if (
                friendship.status !==
                "active"
              ) {

                return;

              }


              result.push({

                id:
                  friendship.id ||
                  `${currentUser.uid}_${friendId}`,

                userId:
                  friendship.userId ||
                  currentUser.uid,

                friendId:
                  friendship.friendId ||
                  friendId,

                createdAt:
                  friendship.createdAt ||
                  0,

                status:
                  "active",

              });

            }
          );


          result.sort(
            (
              a,
              b
            ) =>
              (
                b.createdAt ||
                0
              )
              -
              (
                a.createdAt ||
                0
              )
          );


          setFriends(
            result
          );


          setLoading(false);

        },
        (firebaseError) => {

          console.error(
            "Erreur amis VYLO :",
            firebaseError
          );


          setFriends([]);

          setError(
            "Impossible de charger vos amis."
          );

          setLoading(false);

        }
      );


    return () => {

      unsubscribe();

    };

  }, [
    currentUser,
    authLoading,
  ]);


  /*
  ======================================
  CHARGER LES PROFILS DES AMIS
  ======================================
  */

  useEffect(() => {

    let cancelled =
      false;


    async function loadProfiles() {

      if (
        friends.length ===
        0
      ) {

        setProfiles({});

        return;

      }


      const result:
        Record<
          string,
          UserProfile
        > = {};


      await Promise.all(

        friends.map(
          async (
            friend
          ) => {

            try {

              const profileSnapshot =
                await get(
                  ref(
                    database,
                    `users/${friend.friendId}`
                  )
                );


              if (
                profileSnapshot.exists()
              ) {

                result[
                  friend.friendId
                ] = {

                  uid:
                    friend.friendId,

                  ...profileSnapshot.val(),

                };

              }

            } catch (
              profileError
            ) {

              console.error(
                `Erreur profil ${friend.friendId} :`,
                profileError
              );

            }

          }
        )

      );


      if (
        !cancelled
      ) {

        setProfiles(
          result
        );

      }

    }


    loadProfiles();


    return () => {

      cancelled = true;

    };

  }, [
    friends,
  ]);


  /*
  ======================================
  CHARGER LES DERNIERS MESSAGES
  ======================================
  */

  useEffect(() => {

    if (
      !currentUser ||
      friends.length ===
      0
    ) {

      setLastMessages({});

      setLastMessagesLoading({});

      return;

    }


    const unsubscribers:
      (() => void)[] = [];


    const initialLoading:
      Record<
        string,
        boolean
      > = {};


    friends.forEach(
      (
        friend
      ) => {

        initialLoading[
          friend.friendId
        ] = true;

      }
    );


    setLastMessagesLoading(
      initialLoading
    );


    friends.forEach(
      (
        friend
      ) => {

        const friendId =
          friend.friendId;


        const chatId =
          [
            currentUser.uid,
            friendId,
          ]
            .sort()
            .join("_");


        const messagesRef =
          ref(
            database,
            `vylo/chats/${chatId}/messages`
          );


        const unsubscribe =
          onValue(
            messagesRef,
            (snapshot) => {

              const data =
                snapshot.val();


              if (
                !data
              ) {

                setLastMessages(
                  (
                    previous
                  ) => ({

                    ...previous,

                    [friendId]:
                      "",

                  })
                );


                setLastMessagesLoading(
                  (
                    previous
                  ) => ({

                    ...previous,

                    [friendId]:
                      false,

                  })
                );


                return;

              }


              const messages:
                ChatMessage[] = [];


              Object.entries(
                data
              ).forEach(
                ([
                  id,
                  value,
                ]) => {

                  const message =
                    value as Partial<ChatMessage>;


                  if (
                    typeof message.text !==
                    "string"
                  ) {

                    return;

                  }


                  messages.push({

                    id,

                    senderId:
                      message.senderId,

                    receiverId:
                      message.receiverId,

                    text:
                      message.text,

                    createdAt:
                      message.createdAt ||
                      0,

                  });

                }
              );


              messages.sort(
                (
                  a,
                  b
                ) =>
                  (
                    b.createdAt ||
                    0
                  )
                  -
                  (
                    a.createdAt ||
                    0
                  )
              );


              const latestMessage =
                messages[0];


              setLastMessages(
                (
                  previous
                ) => ({

                  ...previous,

                  [friendId]:
                    latestMessage?.text ||
                    "",

                })
              );


              setLastMessagesLoading(
                (
                  previous
                ) => ({

                  ...previous,

                  [friendId]:
                    false,

                })
              );

            },
            (firebaseError) => {

              console.error(
                `Erreur dernier message ${friendId} :`,
                firebaseError
              );


              setLastMessages(
                (
                  previous
                ) => ({

                  ...previous,

                  [friendId]:
                    "",

                })
              );


              setLastMessagesLoading(
                (
                  previous
                ) => ({

                  ...previous,

                  [friendId]:
                    false,

                })
              );

            }
          );


        unsubscribers.push(
          unsubscribe
        );

      }
    );


    return () => {

      unsubscribers.forEach(
        (
          unsubscribe
        ) => {

          unsubscribe();

        }
      );

    };

  }, [
    currentUser,
    friends,
  ]);


  /*
  ======================================
  ACCEPTER
  ======================================
  */

  async function handleAccept(
    request: VyloFriendRequest
  ) {

    if (
      !currentUser
    ) {

      return;

    }


    try {

      setError(null);

      setProcessingId(
        request.id
      );


      await acceptVyloFriendRequest(
        request,
        currentUser.uid
      );


    } catch (
      acceptError
    ) {

      console.error(
        acceptError
      );


      setError(
        acceptError instanceof Error
          ? acceptError.message
          : "Impossible d'accepter la demande."
      );

    } finally {

      setProcessingId(
        null
      );

    }

  }


  /*
  ======================================
  REFUSER
  ======================================
  */

  async function handleReject(
    request: VyloFriendRequest
  ) {

    if (
      !currentUser
    ) {

      return;

    }


    try {

      setError(null);

      setProcessingId(
        request.id
      );


      await rejectVyloFriendRequest(
        request,
        currentUser.uid
      );


    } catch (
      rejectError
    ) {

      console.error(
        rejectError
      );


      setError(
        rejectError instanceof Error
          ? rejectError.message
          : "Impossible de refuser la demande."
      );

    } finally {

      setProcessingId(
        null
      );

    }

  }


  /*
  ======================================
  INITIAL
  ======================================
  */

  function getInitial(
    username?: string
  ) {

    if (
      !username
    ) {

      return "?";

    }


    return username
      .charAt(0)
      .toUpperCase();

  }


  /*
  ======================================
  OUVRIR CHAT
  ======================================
  */

  function openChat(
    friendId: string
  ) {

    window.location.href =
      `/chat/${friendId}`;

  }


  /*
  ======================================
  FORMATTER DERNIER MESSAGE
  ======================================
  */

  function formatLastMessage(
    message: string
  ) {

    const cleanMessage =
      message.trim();


    if (
      !cleanMessage
    ) {

      return "Nouvel ami ! 💬";

    }


    if (
      cleanMessage.length >
      38
    ) {

      return (
        cleanMessage.slice(
          0,
          38
        ) +
        "..."
      );

    }


    return cleanMessage;

  }


  /*
  ======================================
  RECHERCHE D'UTILISATEURS
  ======================================
  */

  // Fonction de recherche avec debounce
  useEffect(() => {

    if (
      !currentUser ||
      searchQuery.trim().length < 2
    ) {

      setSearchResults([]);

      setSearchError(null);

      return;

    }


    const debounceTimeout =
      setTimeout(
        async () => {

          setSearchLoading(
            true
          );

          setSearchError(
            null
          );

          try {

            const token =
              await currentUser.getIdToken(
                true
              );


            const response =
              await fetch(
                `/api/search?q=${encodeURIComponent(
                  searchQuery.trim()
                )}`,
                {
                  headers:
                    {
                      "Authorization":
                        `Bearer ${token}`,
                    },
                }
              );


            const data =
              await response.json();


            if (
              !response.ok
            ) {

              throw new Error(
                data.error ||
                  "Erreur de recherche"
              );

            }


            if (
              data.success &&
              data.results
            ) {

              // Filtrer l'utilisateur courant
              const filtered =
                data.results.filter(
                  (
                    user: any
                  ) =>
                    user.uid !==
                    currentUser.uid
                );

              console.log("[VYLO] Résultats API bruts:", JSON.stringify(data.results, null, 2));
              console.log("[VYLO] Résultats après filtre utilisateur courant:", filtered.length);

              // Dédupliquer par UID côté client
              const uniqueMap = new Map<string, any>();
              filtered.forEach((user: any) => {
                if (uniqueMap.has(user.uid)) {
                  console.log("[VYLO] Doublon détecté:", user.uid, user.username);
                }
                uniqueMap.set(user.uid, user);
              });
              const uniqueResults = Array.from(uniqueMap.values());

              console.log("[VYLO] Résultats API:", data.results.length);
              console.log("[VYLO] Résultats uniques:", uniqueResults.length);

              // Enrichir avec les statuts d'amitié
              const enriched =
                uniqueResults.map(
                  (
                    user: any
                  ) => {

                    const isFriend =
                      friends.some(
                        (
                          f
                        ) =>
                          f.friendId ===
                          user.uid
                      );


                    const requestPending =
                      requests.some(
                        (
                          r
                        ) =>
                          r.senderId ===
                          user.uid &&
                          r.status ===
                            "pending"
                      );


                    const requestReceived =
                      requests.some(
                        (
                          r
                        ) =>
                          r.receiverId ===
                          user.uid &&
                          r.status ===
                            "pending"
                      );


                    return {

                      uid:
                        user.uid,

                      username:
                        user.username ||
                        "Utilisateur",

                      email:
                        user.email ||
                        "",

                      online:
                        user.online ||
                        false,

                      isFriend,

                      requestPending,

                      requestReceived,

                    };

                  }
                );


              setSearchResults(
                enriched
              );

            } else {

              setSearchResults(
                []
              );

            }

          } catch (
            searchError
          ) {

            console.error(
              "Erreur recherche :",
              searchError
            );


            setSearchError(
              searchError instanceof Error
                ? searchError.message
                : "Erreur de recherche"
            );


            setSearchResults(
              []
            );

          } finally {

            setSearchLoading(
              false
            );

          }

        },
        500
      );


    return () => {

      clearTimeout(
        debounceTimeout
      );

    };

  }, [
    searchQuery,
    currentUser,
    friends,
    requests,
  ]);


  /*
  ======================================
  ENVOYER UNE DEMANDE D'AMI
  ======================================
  */

  async function handleSendFriendRequest(
    targetUid: string
  ) {

    if (
      !currentUser
    ) {

      return;

    }


    try {

      setSearchError(null);

      setProcessingId(
        targetUid
      );


      const token =
        await currentUser.getIdToken(
          true
        );


      const response =
        await fetch(
          "/api/friends/request",
          {
            method:
              "POST",

            headers:
              {
                "Content-Type":
                  "application/json",

                "Authorization":
                  `Bearer ${token}`,
              },

            body:
              JSON.stringify(
                {
                  targetUid,
                }
              ),
          }
        );


      const data =
        await response.json();


      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.error ||
            "Impossible d'envoyer la demande."
        );

      }


      // Mettre à jour l'état de la recherche pour refléter l'envoi
      setSearchResults(
        (
          previous
        ) =>
          previous.map(
            (
              result
            ) =>
              result.uid ===
              targetUid
                ? {
                    ...result,

                    requestPending:
                      true,
                  }
                : result
          )
      );


      // Rafraîchir les demandes (pour les voir dans l'onglet Demandes)
      // Comme l'écoute en temps réel est active, les demandes seront mises à jour automatiquement


    } catch (
      friendError
    ) {

      console.error(
        friendError
      );


      setSearchError(
        friendError instanceof Error
          ? friendError.message
          : "Impossible d'envoyer la demande."
      );

    } finally {

      setProcessingId(
        null
      );

    }

  }


  /*
  ======================================
  AUTH LOADING
  ======================================
  */

  if (
    authLoading
  ) {

    return (

      <main className="min-h-screen bg-[#030303] text-white">

        <div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-5">

          <div className="text-center">

            <div className="mb-3 text-3xl">
              💙
            </div>

            <h1 className="text-lg font-black tracking-tight">
              VYLO
            </h1>

            <p className="mt-1 text-[10px] text-white/30">
              Vérification de votre session...
            </p>

          </div>

        </div>

      </main>

    );

  }


  /*
  ======================================
  NON CONNECTÉ
  ======================================
  */

  if (
    !currentUser
  ) {

    return (

      <main className="min-h-screen bg-[#030303] text-white">

        <div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-5">

          <div className="w-full max-w-xs text-center">

            <div className="mb-4 text-4xl">
              💙
            </div>

            <h1 className="text-xl font-black tracking-tight">
              VYLO
            </h1>

            <p className="mt-2 text-xs text-white/40">
              Connectez-vous pour continuer.
            </p>

          </div>

        </div>

      </main>

    );

  }


  /*
  ======================================
  INTERFACE
  ======================================
  */

  return (

    <main className="min-h-screen bg-[#030303] text-white">


      {/* =================================
          HEADER (harmonisé avec wallet)
      ================================= */}

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/90 backdrop-blur-xl">

        <div className="mx-auto flex h-[58px] w-full max-w-[430px] items-center justify-between px-4">

          <button
            type="button"
            onClick={() => window.location.href = "/dashboard"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/70 transition hover:bg-white/[0.05]"
          >
            ←
          </button>

          <div className="text-center">
            <h1 className="text-[18px] font-black tracking-tight">
              VYLO
            </h1>
            <p className="mt-0.5 text-[9px] text-white/30">
              Tes amis, ton réseau
            </p>
          </div>

          <div className="w-9" />

        </div>

      </header>


      {/* =================================
          CONTENU
      ================================= */}

      <div className="mx-auto w-full max-w-[430px] px-4 pb-[90px] pt-5">


        {/* =================================
            ERREUR
        ================================= */}

        {error && (

          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[10px] leading-4 text-red-300">

            {error}

          </div>

        )}


        {/* =================================
            TABS (avec onglet Explorer)
        ================================= */}

        <div className="mb-4 flex rounded-xl border border-white/[0.07] bg-white/[0.025] p-1">

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                "friends"
              )
            }
            className={`flex-1 rounded-lg py-2 text-[10px] font-bold transition ${
              activeTab ===
              "friends"
                ? "bg-blue-600 text-white shadow-[0_3px_0_rgba(20,70,200,0.8)]"
                : "text-white/40"
            }`}
          >

            👥 Amis

            {friends.length >
              0 && (

              <span className="ml-1 opacity-60">
                {friends.length}
              </span>

            )}

          </button>


          <button
            type="button"
            onClick={() =>
              setActiveTab(
                "requests"
              )
            }
            className={`relative flex-1 rounded-lg py-2 text-[10px] font-bold transition ${
              activeTab ===
              "requests"
                ? "bg-blue-600 text-white shadow-[0_3px_0_rgba(20,70,200,0.8)]"
                : "text-white/40"
            }`}
          >

            🔔 Demandes

            {requests.length >
              0 && (

              <span className="ml-1 rounded-full bg-blue-500 px-1.5 py-0.5 text-[8px] text-white">
                {requests.length}
              </span>

            )}

          </button>


          {/* NOUVEAU : ONGLET EXPLORER */}
          <button
            type="button"
            onClick={() =>
              setActiveTab(
                "explore"
              )
            }
            className={`flex-1 rounded-lg py-2 text-[10px] font-bold transition ${
              activeTab ===
              "explore"
                ? "bg-blue-600 text-white shadow-[0_3px_0_rgba(20,70,200,0.8)]"
                : "text-white/40"
            }`}
          >

            🔍 Explorer

          </button>

        </div>


        {/* =================================
            AMIS
        ================================= */}

        {activeTab ===
          "friends" && (

          <section>

            {loading ? (

              <div className="py-10 text-center">

                <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />

              </div>

            ) : friends.length ===
              0 ? (

              <div className="py-14 text-center">

                <div className="mb-3 text-4xl">
                  👥
                </div>

                <h3 className="text-sm font-bold">
                  Aucun ami pour le moment
                </h3>

                <p className="mx-auto mt-2 max-w-[250px] text-[10px] leading-5 text-white/30">
                  Ajoutez les joueurs que vous rencontrez pendant vos parties.
                </p>

              </div>

            ) : (

              <div className="divide-y divide-white/[0.05]">

                {friends.map(
                  (
                    friend
                  ) => {

                    const profile =
                      profiles[
                        friend.friendId
                      ];


                    const username =
                      profile?.username ||
                      "Utilisateur";


                    const lastMessage =
                      lastMessages[
                        friend.friendId
                      ] ||
                      "";


                    const isLastMessageLoading =
                      lastMessagesLoading[
                        friend.friendId
                      ];


                    return (

                      <div
                        key={
                          friend.id
                        }
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          openChat(
                            friend.friendId
                          )
                        }
                        onKeyDown={(
                          event
                        ) => {

                          if (
                            event.key ===
                            "Enter"
                          ) {

                            openChat(
                              friend.friendId
                            );

                          }

                        }}
                        className="flex cursor-pointer items-center gap-3 py-3 transition hover:bg-white/[0.025] active:bg-white/[0.05]"
                      >

                        {/* AVATAR */}

                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-600/15 text-sm font-black text-blue-300">

                          {getInitial(
                            username
                          )}


                          {profile?.online && (

                            <span className="absolute -bottom-[2px] -right-[2px] h-3 w-3 rounded-full border-2 border-black bg-green-500" />

                          )}

                        </div>


                        {/* NOM + DERNIER MESSAGE */}

                        <div className="min-w-0 flex-1">

                          <p className="truncate text-[12px] font-bold">

                            {username}

                          </p>


                          <p className="mt-0.5 truncate text-[9px] text-white/30">

                            {isLastMessageLoading
                              ? "Chargement..."
                              : formatLastMessage(
                                  lastMessage
                                )}

                          </p>

                        </div>


                        {/* BOUTON CHAT */}

                        <button
                          type="button"
                          onClick={(
                            event
                          ) => {

                            event.stopPropagation();

                            openChat(
                              friend.friendId
                            );

                          }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/15 text-xs shadow-[0_3px_0_rgba(20,80,220,0.35)] transition active:translate-y-[2px] active:shadow-none"
                        >

                          💬

                        </button>

                      </div>

                    );

                  }
                )}

              </div>

            )}

          </section>

        )}


        {/* =================================
            DEMANDES
        ================================= */}

        {activeTab ===
          "requests" && (

          <section>

            {requests.length ===
              0 ? (

              <div className="py-14 text-center">

                <div className="mb-3 text-4xl">
                  🔔
                </div>

                <h3 className="text-sm font-bold">
                  Aucune demande
                </h3>

                <p className="mx-auto mt-2 max-w-[250px] text-[10px] leading-5 text-white/30">
                  Les demandes d'amis reçues pendant vos parties apparaîtront ici.
                </p>

              </div>

            ) : (

              <div className="divide-y divide-white/[0.05]">

                {requests.map(
                  (
                    request
                  ) => (

                    <div
                      key={
                        request.id
                      }
                      className="py-3"
                    >

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-600/15 text-sm font-black text-blue-300">

                          {getInitial(
                            request.senderUsername
                          )}

                        </div>


                        <div className="min-w-0 flex-1">

                          <p className="truncate text-[12px] font-bold">

                            {request.senderUsername ||
                              "Joueur"}

                          </p>

                          <p className="mt-0.5 text-[9px] text-white/30">

                            Vous a envoyé une demande d'ami

                          </p>

                        </div>

                      </div>


                      <div className="mt-3 flex gap-2 pl-[52px]">

                        <button
                          type="button"
                          disabled={
                            processingId ===
                            request.id
                          }
                          onClick={() =>
                            handleAccept(
                              request
                            )
                          }
                          className="rounded-lg bg-blue-600 px-4 py-2 text-[9px] font-black shadow-[0_3px_0_rgba(20,70,200,0.8)] transition hover:bg-blue-500 active:translate-y-[2px] active:shadow-none disabled:opacity-50"
                        >

                          {processingId ===
                          request.id
                            ? "..."
                            : "✓ Accepter"}

                        </button>


                        <button
                          type="button"
                          disabled={
                            processingId ===
                            request.id
                          }
                          onClick={() =>
                            handleReject(
                              request
                            )
                          }
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-[9px] font-bold text-white/50 transition hover:bg-white/[0.08] disabled:opacity-50"
                        >

                          Refuser

                        </button>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </section>

        )}


        {/* =================================
            EXPLORER (NOUVEAU)
        ================================= */}

        {activeTab ===
          "explore" && (

          <section>

            {/* Barre de recherche */}

            <div className="relative">

              <input
                type="text"
                value={searchQuery}
                onChange={(
                  event
                ) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                placeholder="Chercher par nom ou email..."
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 pr-12 text-[13px] font-medium text-white outline-none transition placeholder:text-white/20 focus:border-blue-500/50 focus:bg-blue-600/5"
              />


              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[16px] text-white/30">
                🔍
              </span>

            </div>


            {/* Affichage des résultats */}

            <div className="mt-4">

              {searchError && (

                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] text-red-300">

                  {searchError}

                </div>

              )}


              {searchLoading && (

                <div className="flex items-center justify-center py-6">

                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />

                </div>

              )}


              {!searchLoading &&
                searchQuery.trim().length >=
                  2 &&
                searchResults.length ===
                  0 &&
                !searchError && (

                  <div className="py-14 text-center">

                    <div className="mb-3 text-3xl">
                      🔍
                    </div>

                    <h3 className="text-sm font-bold">
                      Aucun joueur trouvé
                    </h3>

                    <p className="mx-auto mt-2 max-w-[250px] text-[10px] leading-5 text-white/30">
                      Essayez un autre nom ou email.
                    </p>

                  </div>

                )}


              {searchQuery.trim().length <
                2 &&
                !searchLoading && (

                  <div className="py-14 text-center">

                    <div className="mb-3 text-3xl">
                      👤
                    </div>

                    <h3 className="text-sm font-bold">
                      Recherchez des joueurs
                    </h3>

                    <p className="mx-auto mt-2 max-w-[250px] text-[10px] leading-5 text-white/30">
                      Tapez un nom ou un email pour trouver d'autres joueurs.
                    </p>

                  </div>

                )}


              {!searchLoading &&
                searchResults.length >
                  0 && (

                  <div className="divide-y divide-white/[0.05]">

                    {searchResults.map(
                      (
                        result
                      ) => (

                        <div
                          key={
                            result.uid
                          }
                          className="flex items-center gap-3 py-3"
                        >

                          {/* Avatar */}

                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-600/15 text-sm font-black text-blue-300">

                            {getInitial(
                              result.username
                            )}


                            {result.online && (

                              <span className="absolute -bottom-[2px] -right-[2px] h-3 w-3 rounded-full border-2 border-black bg-green-500" />

                            )}

                          </div>


                          {/* Infos */}

                          <div className="min-w-0 flex-1">

                            <p className="truncate text-[12px] font-bold">

                              {result.username}

                            </p>

                            <p className="mt-0.5 truncate text-[9px] text-white/30">

                              {result.email}

                            </p>

                          </div>


                          {/* Bouton d'action */}

                          <button
                            type="button"
                            disabled={
                              processingId ===
                              result.uid
                            }
                            onClick={() =>
                              handleSendFriendRequest(
                                result.uid
                              )
                            }
                            className={`shrink-0 rounded-lg px-4 py-2 text-[9px] font-bold transition active:translate-y-[2px] disabled:opacity-50 ${
                              result.isFriend
                                ? "border border-green-500/20 bg-green-500/10 text-green-400 cursor-default"
                                : result.requestPending
                                ? "border border-yellow-500/20 bg-yellow-500/10 text-yellow-400 cursor-default"
                                : result.requestReceived
                                ? "border border-blue-500/20 bg-blue-500/10 text-blue-400 cursor-default"
                                : "bg-blue-600 text-white shadow-[0_3px_0_rgba(20,70,200,0.8)] hover:bg-blue-500"
                            }`}
                          >

                            {processingId ===
                            result.uid
                              ? "..."
                              : result.isFriend
                              ? "✓ Amis"
                              : result.requestPending
                              ? "⏳ En attente"
                              : result.requestReceived
                              ? "📩 Reçue"
                              : "➕ Ajouter"}

                          </button>

                        </div>

                      )

                    )}

                  </div>

                )}

            </div>

          </section>

        )}

      </div>


      {/* =================================
          NAVIGATION INFÉRIEURE (harmonisée)
      ================================= */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-black/95 backdrop-blur-xl">

        <div className="mx-auto flex h-[62px] w-full max-w-[430px] items-center justify-around px-4">

          <button
            type="button"
            onClick={() => window.location.href = "/dashboard"}
            className="flex min-w-[55px] flex-col items-center justify-center gap-1 text-[8px] text-white/30 transition active:scale-95"
          >
            <span className="text-[18px]">🏠</span>
            Accueil
          </button>

          <button
            type="button"
            onClick={() => window.location.href = "/wallet"}
            className="flex min-w-[55px] flex-col items-center justify-center gap-1 text-[8px] text-white/30 transition active:scale-95"
          >
            <span className="text-[18px]">💼</span>
            Portefeuille
          </button>

          <button
            type="button"
            onClick={() => window.location.href = "/historique"}
            className="flex min-w-[55px] flex-col items-center justify-center gap-1 text-[8px] text-white/30 transition active:scale-95"
          >
            <span className="text-[18px]">📜</span>
            Historique
          </button>

          <button
            type="button"
            className="flex min-w-[55px] flex-col items-center justify-center gap-1 text-[8px] font-bold text-blue-400"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-600/15 text-[17px] shadow-[0_3px_0_rgba(20,70,200,0.35)]">
              👥
            </span>
            VYLO
          </button>

        </div>

      </nav>

    </main>

  );

}
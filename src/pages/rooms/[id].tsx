import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import type { MessageType, UserType } from "../../server/api/routers/room";
import { api } from "../../utils/api";
import avatarImage from "../../../public/avatar.png";
import Image from "next/image";

function MessageItem({
  message,
  session,
}: {
  message: MessageType;
  session: Session | null;
}) {
  return (
    <div
      className={`text-md mb-4 w-7/12 rounded-md p-4 text-gray-700 ${
        message.userName === session?.user?.name
          ? "self-end bg-purple-200 text-black"
          : "bg-purple-900 text-white"
      }`}
    >
      <div className="flex">
        <time>
          {message.createdAt.toLocaleTimeString("en-AU", {
            timeStyle: "short",
          })}{" "}
          - {message.userName}
        </time>
      </div>
      {message.text}
    </div>
  );
}

function RoomPage() {
  const router = useRouter();
  const userId = router.query.id as string;
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const [roomId, setRoomId] = useState("");
  const [isRoomChanged, setIsRoomChanged] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const messageRef = useRef<HTMLDivElement>(null);
  const roomsQuery = api.room.findMany.useQuery();
  const messageQuery = api.message.findMany.useQuery({ roomId });
  const addRoom = api.user.addRoom.useMutation();
  const sendMessageMutation = api.room.sendMessage.useMutation();
  const addMessage = api.message.addMessage.useMutation();
  const enterRoom = api.room.enterRoom.useMutation();

  useEffect(() => {
    // TODO: this is general room's id.
    //  It will be fetched from server in the future
    const roomId = "4356XHrQwPGMizAz5CL13";
    setRoomId(roomId);
    if (roomId && userId) {
      addRoom.mutate({ userId, roomId: roomId });
    }
  }, []);

  useEffect(() => {
    if (messageQuery.data) {
      setMessages(messageQuery.data);
      enterRoom.mutate({ roomId });
    }
  }, [isRoomChanged, messageQuery.data]);

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest",
      });
    }
  }, [messages]);

  api.room.onSendMessage.useSubscription(undefined, {
    onData(data) {
      const user = data.users.find((u) => u.id === userId);
      if (user?.roomId === data.message.roomId) {
        setMessages((m) => {
          return [
            ...m,
            {
              ...data.message,
              createdAt: new Date(),
            },
          ];
        });
      }
    },
    onError(err) {
      console.error("Subscription error:", err);
    },
  });

  api.room.onEnterRoom.useSubscription(undefined, {
    onData(users) {
      setUsers(users);
    },
    onError(err) {
      console.error("Subscription error:", err);
    },
  });

  return (
    <div className="grid md:grid-cols-5">
      <div className="flex flex-col">
        {roomsQuery?.data?.map((room) => {
          return (
            <div
              key={room.id}
              className={`flex cursor-pointer flex-row p-5 ${
                room.id === roomId ? "bg-purple-200" : "white"
              }`}
              onClick={() => {
                setRoomId(room.id);
                addRoom.mutate({ userId, roomId: room.id });
                setIsRoomChanged(!isRoomChanged);
              }}
            >
              <span className={"text-sm font-medium"}>{room.name}</span>
            </div>
          );
        })}
      </div>
      <div className="flex h-screen flex-col border-l-2 border-r-2 md:col-span-3">
        <div className="flex-1 overflow-y-scroll">
          <div className="flex flex-col p-4" ref={messageRef}>
            {messages?.map((m, index) => {
              return (
                <MessageItem
                  key={index}
                  message={m}
                  session={session || null}
                />
              );
            })}
          </div>
        </div>
        <div className={"flex flex-row"}>
          <input
            className="m-5 box-border flex flex-1 rounded-md border p-3 text-gray-700 outline-0"
            onChange={(e) => setMessage(e.target.value)}
            value={message}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessageMutation.mutate({
                  roomId,
                  userId,
                  text: message,
                });
                addMessage.mutate({
                  userId,
                  userName: session?.user?.name ?? "unknown",
                  text: message,
                  roomId,
                });
                setMessage("");
              }
            }}
            placeholder="What do you want to say"
          />
        </div>
      </div>
      <div className="m-3 flex flex-col">
        <div className="flex flex-col">
          <span className={"text ml-1 mb-3 text-sm font-bold"}>People</span>
          {users?.map((user) => {
            return (
              <div
                key={user.id}
                className={"mb-1 flex cursor-pointer flex-row"}
              >
                <Image
                  src={avatarImage}
                  alt="avatar"
                  width={30}
                  height={30}
                  style={{ borderRadius: 15 }}
                />
                <span className={"ml-1 mt-[5px] text-xs font-medium "}>
                  {user.name}
                  {user.name === session?.user?.name ? (
                    <span className={"ml-1 text-purple-400"}>(You)</span>
                  ) : undefined}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RoomPage;

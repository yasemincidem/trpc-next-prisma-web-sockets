import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import type { Message } from "../../server/api/routers/room";
import { api } from "../../utils/api";
import avatarImage from "../../../public/avatar.png";
import Image from "next/image";

function MessageItem({
  message,
  session,
}: {
  message: Message;
  session: Session | null;
}) {
  return (
    <li
      className={`text-md mb-4 w-7/12 rounded-md p-4 text-gray-700 ${
        message.user.name === session?.user?.name
          ? "self-end bg-purple-200 text-black"
          : "bg-purple-900 text-white"
      }`}
    >
      <div className="flex">
        <time>
          {message.createdAt.toLocaleTimeString("en-AU", {
            timeStyle: "short",
          })}{" "}
          - {message.user.name}
        </time>
      </div>
      {message.text}
    </li>
  );
}

function RoomPage() {
  const router = useRouter();
  const userId = router.query.id as string;
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const [roomId, setRoomId] = useState("");
  const [isRoomChanged, setIsRoomChanged] = useState(false);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const messageRef = useRef(null);
  const roomsQuery = api.room.findMany.useQuery();
  const roomQuery = api.room.findOne.useQuery(roomId);
  const messageQuery = api.message.findMany.useQuery({ roomId });
  const addRoom = api.user.addRoom.useMutation();
  const sendMessageMutation = api.room.sendMessage.useMutation();
  const addMessage = api.message.addMessage.useMutation();
  const enterRoom = api.room.enterRoom.useMutation();

  useEffect(() => {
    setRoomId(roomsQuery?.data[0].id);
  }, []);

  useEffect(() => {
    setMessages(messageQuery.data);
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
    onData(message) {
      const user = message.users.find((u) => u.id === userId);
      if (user.roomId === message.roomId) {
        setMessages((m) => {
          return [
            ...m,
            {
              createdAt: new Date(),
              user: { name: message.sender.name },
              text: message.message,
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
    onData(room) {
      setUsers(room.users);
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
                enterRoom.mutate({ roomId: room.id });
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
          <ul className="flex flex-col p-4" ref={messageRef}>
            {messages?.map((m) => {
              return (
                <MessageItem key={m.id} message={m} session={session || null} />
              );
            })}
          </ul>
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
                  message,
                });
                addMessage.mutate({ userId, text: message, roomId });
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
          {roomQuery?.data?.users.map((user) => {
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

import type { Session } from "next-auth";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
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
  const baseStyles =
    "mb-4 text-md w-7/12 p-4 text-gray-700 border border-gray-700 rounded-md";

  const liStyles =
    message.sender.name === session?.user?.name
      ? baseStyles
      : baseStyles.concat(" self-end bg-gray-700 text-white");

  return (
    <li className={liStyles}>
      <div className="flex">
        <time>
          {message.sentAt.toLocaleTimeString("en-AU", {
            timeStyle: "short",
          })}{" "}
          - {message.sender.name}
        </time>
      </div>
      {message.message}
    </li>
  );
}

function RoomPage() {
  const router = useRouter();
  const userId = router.query.id as string;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const utils = api.useContext();
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const [roomId, setRoom] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const roomsQuery = api.room.findMany.useQuery();
  const roomQuery = api.room.findOne.useQuery(roomId);

  api.room.onSendMessage.useSubscription(undefined, {
    onData(message) {
      const user = message.user.find((u) => u.id === userId);
      if (user.roomId === message.roomId) {
        setMessages((m) => {
          return [...m, message];
        });
      }
    },
    onError(err) {
      console.error("Subscription error:", err);
    },
  });
  api.room.onEnterRoom.useSubscription(undefined, {
    onData(message) {
      if (userId === message.userId) {
        setRoom(message.roomId);
      }
    },
    onError(err) {
      console.error("Subscription error:", err);
    },
  });

  const addRoom = api.user.addRoom.useMutation({
    onSuccess: () => {
      utils.user.findMany.invalidate();
    },
  });
  const sendMessageMutation = api.room.sendMessage.useMutation({
    onSuccess: () => {
      utils.user.findMany.invalidate();
    },
  });
  const closeConnectionMutation = api.room.closeConnection.useMutation();

  const leaveChat = () => {
    closeConnectionMutation.mutate({ roomId });
    signIn();
  };
  return (
    <div className="grid md:grid-cols-5">
      <div className="flex h-screen flex-col border-2 md:col-span-4">
        <div className="flex-1">
          <ul className="flex flex-col p-4">
            {messages.map((m) => {
              return (
                <MessageItem key={m.id} message={m} session={session || null} />
              );
            })}
          </ul>
        </div>
        <button className={"w-5/6 bg-blue-400"} onClick={() => leaveChat()}>
          Leave chat
        </button>
        <form
          className="flex"
          onSubmit={(e) => {
            e.preventDefault();

            sendMessageMutation.mutate({
              roomId,
              userId,
              message,
            });

            setMessage("");
          }}
        >
          <textarea
            className="black w-full rounded-md border border-gray-700 bg-gray-50 p-2.5 text-gray-700"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What do you want to say"
          />

          <button className="flex-1 bg-gray-900 p-2.5 text-white" type="submit">
            Send message
          </button>
        </form>
      </div>
      <div className="m-3 flex flex-col">
        <span className={"mt-10 mb-5 ml-1 font-bold"}>Groups</span>
        {roomsQuery?.data?.map((room) => {
          return (
            <div
              key={room.id}
              className={"m-1 flex cursor-pointer flex-row"}
              style={{
                backgroundColor: room.id === roomId ? "red" : "white",
              }}
              onClick={() => {
                addRoom.mutate({ userId, roomId: room.id });
                sendMessageMutation.mutate({
                  roomId: room.id,
                  userId,
                  message: "new group",
                });
                setRoom(room.id);
                setMessages([]);
              }}
            >
              <span className={"ml-1 mt-1 text-sm font-medium"}>
                {room.name}
              </span>
            </div>
          );
        })}
        <div className="m-3 flex flex-col">
          <span className={"mt-10 mb-5 ml-1 font-bold"}>People</span>
          {roomQuery?.data?.users.map((user) => {
            return (
              <div key={user.id} className={"m-1 flex cursor-pointer flex-row"}>
                <Image
                  src={avatarImage}
                  alt="avatar"
                  width={30}
                  height={30}
                  style={{ borderRadius: 15 }}
                />
                <span className={"ml-1 mt-1 text-sm font-medium"}>
                  {user.name}
                  {user.name === session?.user?.name ? (
                    <span className={"ml-1 text-blue-400"}>(You)</span>
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

/* eslint-disable @typescript-eslint/no-misused-promises */
import { type NextPage } from "next";
import { useRouter } from "next/router";
import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { api } from "../utils/api";
import Image from "next/image";

const Home: NextPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const usersQuery = api.user.findMany.useQuery();

  const createRoom = () => {
    const user = usersQuery?.data?.find(
      (user) => user.name === session?.user?.name
    );
    if (user) {
      router.replace(`/rooms/${user.id}`).catch(() => console.log("err"));
    }
  };
  useEffect(() => {
    if (session?.user?.name) {
      createRoom();
    }
  }, [session]);
  return (
    <div className={"relative"}>
      <div className={"fixed -z-10 h-screen w-screen overflow-hidden"}>
        <Image
          src="/background.jpeg"
          alt="Mountains"
          quality={100}
          fill
          sizes="100vw"
          style={{
            objectFit: "cover",
          }}
        />
      </div>
      <div className="absolute inset-0 flex h-screen items-center justify-center">
        <div className="block max-w-sm rounded-lg bg-white p-6 shadow-lg">
          <h5 className="mb-2 text-xl font-medium leading-tight text-gray-900">
            Real Time Chat Application.
          </h5>
          <p className="mb-4 text-base text-gray-700">
            Go to sign in page by clicking the following button
          </p>
          <button
            type="button"
            onClick={() => signIn()}
            className="inline-block w-full rounded bg-gray-800 px-6 py-2.5 text-xs font-medium uppercase leading-tight text-white shadow-md transition duration-150 ease-in-out hover:bg-gray-900 hover:shadow-lg focus:bg-gray-900 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-gray-900 active:shadow-lg"
          >
            Go to Chat app
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;

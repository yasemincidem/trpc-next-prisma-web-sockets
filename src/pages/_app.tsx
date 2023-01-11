import type { AppProps } from "next/app";
import { Session } from "next-auth";
import {api} from "../utils/api";

import { SessionProvider } from "next-auth/react";
import "../styles/globals.css";

const MyApp = ({Component,pageProps}: AppProps<{
  session: Session;
}>) => {
  return (
      <SessionProvider session={pageProps.session}>
        <Component {...pageProps} />
      </SessionProvider>
  );
};


export default api.withTRPC(MyApp);

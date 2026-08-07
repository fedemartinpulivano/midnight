import { createConfig, http, injected } from "wagmi";
import { CHAIN, RPC_URL } from "./contracts";

export const wagmiConfig = createConfig({
  chains: [CHAIN],
  connectors: [injected()],
  transports: {
    [CHAIN.id]: http(RPC_URL),
  },
  ssr: true,
});

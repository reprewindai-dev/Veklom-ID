import { QueryClient } from "@tanstack/react-query";
import { createConfig, http } from "wagmi";
import { base, mainnet } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";

export const veklomQueryClient = new QueryClient();

const walletConnectors =
  typeof window === "undefined"
    ? []
    : [
        coinbaseWallet({
          appName: "Veklom ID",
        }),
        injected({
          target: "metaMask",
        }),
        injected(),
      ];

export const veklomWalletConfig = createConfig({
  chains: [base, mainnet],
  connectors: walletConnectors,
  transports: {
    [base.id]: http("https://mainnet.base.org"),
    [mainnet.id]: http(),
  },
});

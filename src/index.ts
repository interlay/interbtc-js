import { BitcoinNetwork, createInterbtcAPI, InterBTCAPI, WrappedCurrency } from "@interlay/interbtc-api";
import { AddressOrPair } from "@polkadot/api/types";
import { DefaultIndexAPI, WrappedIndexAPI } from "./interbtcIndex";
import { ApiPromise } from "@polkadot/api";

export const INDEX_LOCAL_URL = "http://localhost:3007";

export async function createInterbtc(
    endpoint: string,
    network?: BitcoinNetwork,
    wrappedCurrency?: WrappedCurrency,
    indexEndpoint?: string,
    account?: AddressOrPair,
    autoConnect?: number | false | undefined
): Promise<InterBtc> {
    const interBtcApi = await createInterbtcAPI(endpoint, network, wrappedCurrency, account, autoConnect);
    const polkadotApi = interBtcApi.api;
    const interBtcIndex = DefaultIndexAPI({ basePath: indexEndpoint }, polkadotApi);
    return new DefaultInterBtc(polkadotApi, interBtcApi, interBtcIndex);
}

export interface InterBtc {
    readonly polkadotApi: ApiPromise;
    readonly interBtcApi: InterBTCAPI;
    readonly interBtcIndex: WrappedIndexAPI;
}

export class DefaultInterBtc implements InterBtc {
    public readonly polkadotApi: ApiPromise;
    public readonly interBtcApi: InterBTCAPI;
    public readonly interBtcIndex: WrappedIndexAPI;

    constructor(
        polkadotApi: ApiPromise,
        interBtcApi: InterBTCAPI,
        interBtcIndex: WrappedIndexAPI,

    ) {
        this.polkadotApi = polkadotApi;
        this.interBtcApi = interBtcApi;
        this.interBtcIndex = interBtcIndex;
    }
}

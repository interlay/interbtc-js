import { BitcoinNetwork, createInterBtcApi, InterBtcApi } from "@interlay/interbtc-api";
import { AddressOrPair } from "@polkadot/api/types";
import { DefaultIndexAPI, WrappedIndexAPI } from "./interbtcIndex";
import { ApiPromise } from "@polkadot/api";

export const INDEX_LOCAL_URL = "http://localhost:3007";

export async function createInterbtc(
    endpoint: string,
    network?: BitcoinNetwork,
    indexEndpoint?: string,
    account?: AddressOrPair,
    autoConnect?: number | false | undefined
): Promise<InterBtc> {
    const interBtcApi = await createInterBtcApi(endpoint, network, account, autoConnect);
    const polkadotApi = interBtcApi.api;
    const interBtcIndex = DefaultIndexAPI({ basePath: indexEndpoint }, interBtcApi);
    return new DefaultInterBtc(polkadotApi, interBtcApi, interBtcIndex);
}

export interface InterBtc {
    readonly polkadotApi: ApiPromise;
    readonly interBtcApi: InterBtcApi;
    readonly interBtcIndex: WrappedIndexAPI;
}

export class DefaultInterBtc implements InterBtc {
    public readonly polkadotApi: ApiPromise;
    public readonly interBtcApi: InterBtcApi;
    public readonly interBtcIndex: WrappedIndexAPI;

    constructor(
        polkadotApi: ApiPromise,
        interBtcApi: InterBtcApi,
        interBtcIndex: WrappedIndexAPI,

    ) {
        this.polkadotApi = polkadotApi;
        this.interBtcApi = interBtcApi;
        this.interBtcIndex = interBtcIndex;
    }
}

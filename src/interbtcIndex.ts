/* eslint @typescript-eslint/no-var-requires: "off" */
import * as interbtcIndex from "@interlay/interbtc-index-client";
import {
    FetchAPI,
    IndexApi as RawIndexApi,
    Middleware,
    SatoshisTimeData,
} from "@interlay/interbtc-index-client";
import { Bitcoin, BitcoinAmount, BitcoinUnit, Currency, Kusama, KusamaAmount, KusamaUnit, MonetaryAmount, Polkadot, PolkadotUnit } from "@interlay/monetary-js";
import { ApiPromise } from "@polkadot/api";
import Big from "big.js";
import {Issue, Redeem, VaultExt, newCollateralBTCExchangeRate, CollateralUnit, newVaultId, decodeVaultId, InterbtcPrimitivesVaultId, newMonetaryAmount, currencyIdToMonetaryCurrency, currencyIdToLiteral, InterBtcApi} from "@interlay/interbtc-api";
import { CollateralBtcOracleStatus } from "./oracleTypes";
import {currencyNameToCurrency, currencyFactory } from "./currencyMapper";

// TODO: export SatoshisTimeData from `interbtcIndex`
export interface BTCTimeData {
    date: Date;
    btc: BitcoinAmount;
}

function constructExchangeRate(currencyKey: string, rawRate: string) {
    switch (currencyKey) {
        case "DOT":
            return newCollateralBTCExchangeRate<PolkadotUnit>(
                new Big(rawRate),
                Polkadot
            );
        case "KSM":
            return newCollateralBTCExchangeRate<KusamaUnit>(
                new Big(rawRate),
                Kusama
            );
    }
}

/* Add wrappers here. Use keys matching the raw API call names to override those APIs with the wrappers. */
const explicitWrappers = (index: RawIndexApi, interBtcApi: InterBtcApi) => {
    return {
        getLatestSubmissionForEachOracle: async (currencyKey: string): Promise<CollateralBtcOracleStatus[]> => {
            const oracleStatus = await index.getLatestSubmissionForEachOracle({ currencyKey });
            return oracleStatus.map((rawStatus) => {
                const exchangeRate = constructExchangeRate(currencyKey, rawStatus.exchangeRate)
                return {
                    ...rawStatus,
                    exchangeRate,
                } as CollateralBtcOracleStatus;
            });
        },
        getLatestSubmission: async (currencyKey: string): Promise<CollateralBtcOracleStatus> => {
            const submission = await index.getLatestSubmission({ currencyKey });
            const exchangeRate = constructExchangeRate(currencyKey, submission.exchangeRate);
            return {
                ...submission,
                exchangeRate,
            } as CollateralBtcOracleStatus;
        },
        currentVaultData: async (): Promise<VaultExt<BitcoinUnit>[]> => {
            const indexCachedVaults = await index.currentVaultData();
            return indexCachedVaults.map((indexVault) => {
                const decodedVaultId = decodeVaultId(interBtcApi.api, indexVault.id) as InterbtcPrimitivesVaultId;
                const vaultId = decodedVaultId(interBtcApi.api, indexVault.id);
                const collateralCurrency = currencyIdToMonetaryCurrency(vaultId.currencies.collateral) as Currency<CollateralUnit>;
                return new VaultExt<BitcoinUnit>(
                    interBtcApi.api,
                    interBtcApi.oracle,
                    interBtcApi.system,
                    indexVault.wallet,
                    newMonetaryAmount(indexVault.backingCollateral, collateralCurrency),
                    decodedVaultId,
                    indexVault.status,
                    indexVault.bannedUntil === null ? undefined : indexVault.bannedUntil,
                    new BitcoinAmount(Bitcoin, indexVault.toBeIssuedTokens),
                    new BitcoinAmount(Bitcoin, indexVault.issuedTokens),
                    new BitcoinAmount(Bitcoin, indexVault.toBeRedeemedTokens),
                    new BitcoinAmount(Bitcoin, indexVault.toBeReplacedTokens),
                    newMonetaryAmount(indexVault.replaceCollateral, collateralCurrency),
                    newMonetaryAmount(indexVault.liquidatedCollateral, collateralCurrency),
                );
            });
        },
        getIssues: async (requestParameters: interbtcIndex.GetIssuesRequest): Promise<Issue[]> => {
            const issues = await index.getIssues(requestParameters);
            return issues.map(issue => indexIssueToTypedIssue(interBtcApi.api, issue));
        },
        getRedeems: async (requestParameters: interbtcIndex.GetRedeemsRequest): Promise<Redeem[]> => {
            const redeems = await index.getRedeems(requestParameters);
            return redeems.map(redeem => indexRedeemToTypedRedeem(interBtcApi.api, redeem));
        },
        getFilteredIssues: async (requestParameters: interbtcIndex.GetFilteredIssuesRequest): Promise<Issue[]> => {
            const issues = await index.getFilteredIssues(requestParameters);
            return issues.map(issue => indexIssueToTypedIssue(interBtcApi.api, issue));
        },
        getFilteredRedeems: async (requestParameters: interbtcIndex.GetFilteredRedeemsRequest): Promise<Redeem[]> => {
            const redeems = await index.getFilteredRedeems(requestParameters);
            return redeems.map(redeem => indexRedeemToTypedRedeem(interBtcApi.api, redeem));
        },
        getRecentDailyIssues: async (
            requestParameters: interbtcIndex.GetRecentDailyIssuesRequest
        ): Promise<BTCTimeData[]> => {
            const issues = await index.getRecentDailyIssues(requestParameters);
            return issues.map(satoshisToBtcTimeData);
        },
        getRecentDailyRedeems: async (
            requestParameters: interbtcIndex.GetRecentDailyRedeemsRequest
        ): Promise<BTCTimeData[]> => {
            const redeems = await index.getRecentDailyRedeems(requestParameters);
            return redeems.map(satoshisToBtcTimeData);
        },
        getDustValue: async (): Promise<BitcoinAmount> => {
            // the returned string contains double-quotes (e.g. `"100"`), which must be removed
            const parsedDustValue = (await index.getDustValue()).split('"').join("");
            return BitcoinAmount.from.Satoshi(parsedDustValue);
        },
    };
};

/* Rest of the file autogenerates thin wrappers for the rest of the API calls and takes care of the typing. */

// The generated client contains the following autogenerated middleware helpers, which must be filtered out
const GeneratedMiddlewareFns = ["withMiddleware", "withPreMiddleware", "withPostMiddleware"] as const;
type GeneratedMiddlewareFns = typeof GeneratedMiddlewareFns[number];
// For every 'foo() => Promise<T>' function, the generated client
// has a 'fooRaw() => <Promise<ApiResponse<T>>' counterpart. These must be filtered out.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawApiResponse = Promise<interbtcIndex.ApiResponse<any>>;

export type ExplicitlyWrappedIndexAPI = ReturnType<typeof explicitWrappers>;

export type ThinWrappedIndexAPI = Pick<
    interbtcIndex.IndexApi,
    {
        [ApiFn in keyof interbtcIndex.IndexApi]-?: ReturnType<interbtcIndex.IndexApi[ApiFn]> extends RawApiResponse
        ? never
        : ApiFn extends GeneratedMiddlewareFns
        ? never
        : ApiFn extends keyof ExplicitlyWrappedIndexAPI
        ? never
        : ApiFn;
    }[keyof interbtcIndex.IndexApi]
>;

export type WrappedIndexAPI = ThinWrappedIndexAPI & ExplicitlyWrappedIndexAPI;

export const DefaultIndexAPI: (
    configurationParams: interbtcIndex.ConfigurationParameters,
    interBtcApi: InterBtcApi
) => WrappedIndexAPI = (configuration, interBtcApi) => {
    const config = new interbtcIndex.Configuration({
        ...configuration,
        // use custom `fetchAPI`, that works both in browser and in node
        fetchApi: require("isomorphic-fetch") as FetchAPI,
        // there is a bug in the generator, where the middleware must at least be an empty array, instead of `undefined`
        middleware: [] as Middleware[],
    });
    const index = new interbtcIndex.IndexApi(config);
    const instantiatedExplicitWrappers = explicitWrappers(index, interBtcApi);


    const excludeFromThinWrappers = (key: string) =>
        Object.keys(explicitWrappers).includes(key) ||
        (GeneratedMiddlewareFns as readonly string[]).includes(key) ||
        key.includes("Raw") ||
        key === "constructor";
    const keys = (Object.getOwnPropertyNames(Object.getPrototypeOf(index)) as (keyof typeof index)[]).filter(
        (apiName) => !excludeFromThinWrappers(apiName)
    );

    const thinWrappers = Object.fromEntries(
        keys.map((apiName) => {
            return [
                apiName,
                // all functions only have one arg
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (arg?: any) => {
                    return index[apiName](arg);
                },
            ];
        })
    ) as ThinWrappedIndexAPI;

    return {
        ...thinWrappers,
        ...instantiatedExplicitWrappers,
    };
};

export function indexIssueToTypedIssue(api: ApiPromise, issue: interbtcIndex.IndexIssue): Issue {
    // TODO determine collateralCurrency based on vault
    return {
        ...issue,
        wrappedAmount: BitcoinAmount.from.Satoshi(issue.wrappedAmount),
        bridgeFee: BitcoinAmount.from.Satoshi(issue.bridgeFee),
        // NOTE: KusamaAmount is hardcoded here, theoretically need a way to pass "ParachainCurrency"
        // In practice though this will be deprecated before we move off Kusama, hence an extra parameter is not being added for this
        griefingCollateral: KusamaAmount.from.KSM(issue.griefingCollateral) as MonetaryAmount<Currency<CollateralUnit>, CollateralUnit>,
        btcAmountSubmittedByUser: issue.btcAmountSubmittedByUser
            ? BitcoinAmount.from.Satoshi(issue.btcAmountSubmittedByUser)
            : undefined,
        refundAmountWrapped: issue.refundAmountWrapped ? BitcoinAmount.from.Satoshi(issue.refundAmountWrapped) : undefined,
        executedAmountWrapped: issue.executedAmountWrapped ? BitcoinAmount.from.Satoshi(issue.executedAmountWrapped) : undefined,
        userParachainAddress: issue.userParachainAddress,
        vaultId: decodeVaultId(api, issue.vaultId)
    };
}

export function indexRedeemToTypedRedeem(api: ApiPromise, redeem: interbtcIndex.IndexRedeem): Redeem {
    const vaultId = decodeVaultId(api, redeem.vaultId);
    const vaultCollateralCurrency = currencyIdToMonetaryCurrency(vaultId.currencies.collateral) as Currency<CollateralUnit>;
    const newVaultCollateralAmount = currencyFactory(vaultCollateralCurrency);
    return {
        ...redeem,
        amountBTC: BitcoinAmount.from.Satoshi(redeem.amountBTC),
        collateralPremium: newVaultCollateralAmount(redeem.collateralPremium, true),
        bridgeFee: BitcoinAmount.from.Satoshi(redeem.bridgeFee),
        btcTransferFee: BitcoinAmount.from.Satoshi(redeem.btcTransferFee),
        userParachainAddress: redeem.userParachainAddress,
        vaultId: decodeVaultId(api, redeem.vaultId)
    };
}

export function satoshisToBtcTimeData(data: SatoshisTimeData): BTCTimeData {
    return {
        date: new Date(data.date),
        btc: BitcoinAmount.from.Satoshi(data.sat),
    };
}

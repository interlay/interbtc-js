/* eslint @typescript-eslint/no-var-requires: "off" */
import * as interbtcIndex from "@interlay/interbtc-index-client";
import {
    FetchAPI,
    IndexApi as RawIndexApi,
    Middleware,
    SatoshisTimeData,
} from "@interlay/interbtc-index-client";
import { Bitcoin, BitcoinAmount, BitcoinUnit, Currency, KusamaAmount, MonetaryAmount, Polkadot, PolkadotUnit } from "@interlay/monetary-js";
import { ApiPromise } from "@polkadot/api";
import Big from "big.js";
import {Issue, Redeem, VaultExt, newCollateralBTCExchangeRate, CollateralUnit} from "@interlay/interbtc-api";
import { CollateralBtcOracleStatus } from "./oracleTypes";
import {currencyNameToCurrency, currencyFactory, Factory} from "./currencyMapper";

// TODO: export SatoshisTimeData from `interbtcIndex`
export interface BTCTimeData {
    date: Date;
    btc: BitcoinAmount;
}

/* Add wrappers here. Use keys matching the raw API call names to override those APIs with the wrappers. */
const explicitWrappers = (index: RawIndexApi, api: ApiPromise) => {
    return {
        getLatestSubmissionForEachOracle: async (currencyKey: string): Promise<CollateralBtcOracleStatus[]> => {
            const oracleStatus = await index.getLatestSubmissionForEachOracle({ currencyKey });
            return oracleStatus.map((rawStatus) => {
                const exchangeRate = newCollateralBTCExchangeRate<PolkadotUnit>(
                    new Big(rawStatus.exchangeRate),
                    Polkadot
                );
                return {
                    ...rawStatus,
                    exchangeRate,
                } as CollateralBtcOracleStatus;
            });
        },
        getLatestSubmission: async (currencyKey: string): Promise<CollateralBtcOracleStatus> => {
            const submission = await index.getLatestSubmission({ currencyKey });
            const exchangeRate = newCollateralBTCExchangeRate<PolkadotUnit>(new Big(submission.exchangeRate), Polkadot);
            return {
                ...submission,
                exchangeRate,
            } as CollateralBtcOracleStatus;
        },
        currentVaultData: async (): Promise<VaultExt<BitcoinUnit>[]> => {
            const indexCachedVaults = await index.currentVaultData();
            return indexCachedVaults.map((indexVault) => {
                const vaultCollateralCurrency = currencyNameToCurrency(indexVault.collateralCurrency);
                const newVaultCollateralAmount = currencyFactory(vaultCollateralCurrency) as Factory<CollateralUnit>;
                return {
                    wallet: indexVault.wallet,
                    backingCollateral: newVaultCollateralAmount(indexVault.backingCollateral),
                    id: api.createType("AccountId", indexVault.id),
                    status: indexVault.status,
                    bannedUntil: indexVault.bannedUntil === null ? undefined : indexVault.bannedUntil,
                    toBeIssuedTokens: new BitcoinAmount(Bitcoin, indexVault.toBeIssuedTokens),
                    issuedTokens: new BitcoinAmount(Bitcoin, indexVault.issuedTokens),
                    toBeRedeemedTokens: new BitcoinAmount(Bitcoin, indexVault.toBeRedeemedTokens),
                    toBeReplacedTokens: new BitcoinAmount(Bitcoin, indexVault.toBeReplacedTokens),
                    replaceCollateral: newVaultCollateralAmount(indexVault.replaceCollateral),
                    liquidatedCollateral: newVaultCollateralAmount(indexVault.liquidatedCollateral),
                    collateralCurrency: vaultCollateralCurrency as unknown as Currency<CollateralUnit>,
                };
            });
        },
        getIssues: async (requestParameters: interbtcIndex.GetIssuesRequest): Promise<Issue[]> => {
            const issues = await index.getIssues(requestParameters);
            return issues.map(indexIssueToTypedIssue);
        },
        getRedeems: async (requestParameters: interbtcIndex.GetRedeemsRequest): Promise<Redeem[]> => {
            const redeems = await index.getRedeems(requestParameters);
            return redeems.map(indexRedeemToTypedRedeem);
        },
        getFilteredIssues: async (requestParameters: interbtcIndex.GetFilteredIssuesRequest): Promise<Issue[]> => {
            const issues = await index.getFilteredIssues(requestParameters);
            return issues.map(indexIssueToTypedIssue);
        },
        getFilteredRedeems: async (requestParameters: interbtcIndex.GetFilteredRedeemsRequest): Promise<Redeem[]> => {
            const redeems = await index.getFilteredRedeems(requestParameters);
            return redeems.map(indexRedeemToTypedRedeem);
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
    api: ApiPromise
) => WrappedIndexAPI = (configuration, api) => {
    const config = new interbtcIndex.Configuration({
        ...configuration,
        // use custom `fetchAPI`, that works both in browser and in node
        fetchApi: require("isomorphic-fetch") as FetchAPI,
        // there is a bug in the generator, where the middleware must at least be an empty array, instead of `undefined`
        middleware: [] as Middleware[],
    });
    const index = new interbtcIndex.IndexApi(config);

    const instantiatedExplicitWrappers = explicitWrappers(index, api);

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

export function indexIssueToTypedIssue(issue: interbtcIndex.IndexIssue): Issue {
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
        refundAmountBTC: issue.refundAmountBTC ? BitcoinAmount.from.Satoshi(issue.refundAmountBTC) : undefined,
        executedAmountBTC: issue.executedAmountBTC ? BitcoinAmount.from.Satoshi(issue.executedAmountBTC) : undefined,
        userParachainAddress: issue.userParachainAddress,
        vaultParachainAddress: issue.vaultParachainAddress
    };
}

export function indexRedeemToTypedRedeem(redeem: interbtcIndex.IndexRedeem): Redeem {
    // TODO determine collateralCurrency based on vault
    const newVaultCollateralAmount = currencyFactory(redeem.collateralCurrencyName) as Factory<CollateralUnit>;
    return {
        ...redeem,
        amountBTC: BitcoinAmount.from.Satoshi(redeem.amountBTC),
        collateralPremium: newVaultCollateralAmount(redeem.collateralPremium, true),
        bridgeFee: BitcoinAmount.from.Satoshi(redeem.bridgeFee),
        btcTransferFee: BitcoinAmount.from.Satoshi(redeem.btcTransferFee),
        userParachainAddress: redeem.userParachainAddress,
        vaultParachainAddress: redeem.vaultParachainAddress
    };
}

export function satoshisToBtcTimeData(data: SatoshisTimeData): BTCTimeData {
    return {
        date: new Date(data.date),
        btc: BitcoinAmount.from.Satoshi(data.sat),
    };
}

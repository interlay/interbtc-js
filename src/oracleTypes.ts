import { Bitcoin, BitcoinUnit, Currency, ExchangeRate, Polkadot, PolkadotUnit, UnitList } from "@interlay/monetary-js";

export interface OracleStatus<
    B extends Currency<BaseUnit>,
    BaseUnit extends UnitList,
    C extends Currency<CounterUnit>,
    CounterUnit extends UnitList
    > {
    id: string;
    source: string;
    feed: string;
    lastUpdate: Date;
    exchangeRate: ExchangeRate<B, BaseUnit, C, CounterUnit>;
    online: boolean;
}

// TODO: May need generic collateral currency
export type DotBtcOracleStatus = OracleStatus<Bitcoin, BitcoinUnit, Polkadot, PolkadotUnit>;

export type FeeEstimationType = "Fast" | "Half" | "Hour";

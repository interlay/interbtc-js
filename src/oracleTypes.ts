import { CollateralUnit } from "@interlay/interbtc-api";
import { Bitcoin, BitcoinUnit, Currency, ExchangeRate, UnitList } from "@interlay/monetary-js";

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
export type CollateralBtcOracleStatus = OracleStatus<Bitcoin, BitcoinUnit, Currency<CollateralUnit>, CollateralUnit>;

export type FeeEstimationType = "Fast" | "Half" | "Hour";

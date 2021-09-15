import {newMonetaryAmount} from "@interlay/interbtc-api";
import { Bitcoin, Currency, Interlay, Kintsugi, Kusama, MonetaryAmount, Polkadot, UnitList } from "@interlay/monetary-js";
import { BigSource } from "big.js";

export type Factory<U extends UnitList> = (amount: BigSource, base?: boolean) => MonetaryAmount<Currency<U>, U>

export function currencyNameToCurrency<U extends UnitList>(name: string): Currency<U> {
    let currency: any;
    switch (name) {
        case "Bitcoin": currency = Bitcoin;
            break;
        case "Polkadot": currency = Polkadot;
            break;
        case "Kusama": currency = Kusama;
            break;
        case "Interlay": currency = Interlay;
            break;
        case "Kintsugi": currency = Kintsugi;
            break;
    }
    return currency;
}

export function currencyFactory<U extends UnitList>(currency: any): Factory<U> {
    return ((amount: BigSource, base = false) => newMonetaryAmount(amount, currency, base)) as unknown as Factory<U>;
}

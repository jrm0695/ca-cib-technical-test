import {useCallback, useEffect, useState} from "react";

function random(x: number, y: number): number {
	return Math.random() * (y - x) + x;
}

class Instrument {
	base: string;
	quote: string;

	constructor(params: { // I always add this to constructor to allow named parameters (TS do not have that natively)
		base: string,
		quote: string,
	}) {
		this.base = params.base;
		this.quote = params.quote;
	}

	/**
	 * Rate always given as BASEQUOTE (ex: EURUSD = X USD for 1 EUR)
	 * @param amount
	 * @param amountIn
	 * @param at
	 */
	public convert(amount: number, amountIn: AmountType, at: number): number {
		if (amountIn === AmountType.BASE) {
			return amount * at;
		} else {
			return amount / at;
		}
	}

	public tickerOf(type: AmountType): string {
		return type === AmountType.BASE ? this.base : this.quote;
	}

	toString(): string {
		return this.base + this.quote;
	}
}

const eurusd = new Instrument({base: "EUR", quote: "USD"})

enum AmountType {
	BASE = "base",
	QUOTE = "quote",
}
function oppositeOf(type: AmountType): AmountType {
	return type === AmountType.BASE ? AmountType.QUOTE : AmountType.BASE;
}

const maxPctDiffOverride = 10

export default function App() {
	const [rateLive, setRateLive] = useState<number>(1.1)
	const [rateOverride, setRateOverride] = useState<number | undefined>(undefined)

	const [instrument, _] = useState<Instrument>(eurusd)
	const [amountForFx, setAmountForFx] = useState<number | undefined>(undefined)
	const [amountForFxIn, setAmountForFxIn] = useState<AmountType>(AmountType.BASE)

	useEffect(() => {
		setInterval(() => {
			const dr = random(-0.05, 0.05)
			setRateLive(prev => prev + dr)
		}, 3000)
	}, [])

	const getPctDiff = useCallback((): number | undefined => {
		if (rateOverride === undefined) {
			return undefined
		}
		const pctDiff =  Math.abs((rateOverride / rateLive - 1) * 100)
		console.log("pct diff", Math.abs((rateOverride / rateLive - 1) * 100))
		return pctDiff
	}, [rateOverride, rateLive])

	const getRate = useCallback(() => {
		if (rateOverride && (getPctDiff() > maxPctDiffOverride)) {
			return rateLive
		}
		return rateOverride ? rateOverride : rateLive
	}, [rateOverride, rateLive, getPctDiff])

	const onAmountForFxInChange = useCallback((newValue: AmountType) => {
		const lastIn = amountForFxIn
		setAmountForFxIn(newValue)

		// when user change "in" : switch input value to new type
		setAmountForFx(prevState => instrument.convert(prevState, lastIn, getRate()))
	}, [amountForFxIn, instrument, getRate])

	return (<div>
		<h1>CACIB - React Technical Test</h1>
		<p> {instrument.toString()} : {rateLive.toFixed(4)} <br/>
			OR override :

		<input
			type="number"
			value={rateOverride ?? ""}
			placeholder={instrument.toString() + " rate override"}
			onChange={e => setRateOverride(parseFloat(e.target.value))}
			style={{backgroundColor: getPctDiff() !== undefined && getPctDiff() > maxPctDiffOverride ? "red" : "white" }}
		/>
			{getPctDiff() !== undefined && getPctDiff() > maxPctDiffOverride ? " (over max % diff, live rate used)" : ""}
		</p>

		<h2>Convert FX</h2>
		<div>
		<input
			type="number"
	        placeholder={"Amount in " + instrument.tickerOf(amountForFxIn)}
			value={amountForFx ?? ""}
			onChange={e => setAmountForFx(e.target.value !== "" ? parseFloat(e.target.value) : undefined )}
		/>
		<select
			value={amountForFxIn}
			onChange={(e) => onAmountForFxInChange(e.target.value as AmountType)}
		>
			{Object.values(AmountType).map((v) => (
				<option key={v} value={v}>{instrument.tickerOf(v)}</option>
			))}
		</select>
		</div>

		{amountForFx !== undefined && (
			<p>
				{amountForFx.toFixed(4)} {instrument.tickerOf(amountForFxIn)}
				&nbsp;=&nbsp;
				{instrument.convert(amountForFx, amountForFxIn, getRate()).toFixed(4)}&nbsp;
				{instrument.tickerOf(oppositeOf(amountForFxIn))}
			</p>
		)}
	
	</div>)
}
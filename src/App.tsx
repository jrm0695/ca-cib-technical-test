import {useCallback, useEffect, useState} from "react";
import "./app.css";

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

class ConversionSaved {
	realTimeRate: number;
	overrideRate: number | undefined;
	initialAmount: number | undefined;
	amountType: AmountType;
	instrument: Instrument;
	convertedAmount: number | undefined;

	constructor(params: {
		realTimeRate: number,
		overrideRate: number | undefined,
		initialAmount: number | undefined,
		amountType: AmountType,
		instrument: Instrument,
		convertedAmount: number | undefined,
	}) {
		this.realTimeRate = params.realTimeRate;
		this.overrideRate = params.overrideRate;
		this.initialAmount = params.initialAmount;
		this.amountType = params.amountType;
		this.instrument = params.instrument;
		this.convertedAmount = params.convertedAmount;
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

	const [conversionsSaved, setConversionsSaved] = useState<ConversionSaved[]>([])

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

		setAmountForFx(prevState => instrument.convert(prevState, lastIn, getRate()))
	}, [amountForFxIn, instrument, getRate])

	const saveConversion = useCallback(() => {
		setConversionsSaved(prevState => {
			const updated = prevState.concat(new ConversionSaved({
				realTimeRate: rateLive,
				overrideRate: rateOverride,
				initialAmount: amountForFx,
				amountType: amountForFxIn,
				instrument: instrument,
				convertedAmount: amountForFx !== undefined ? instrument.convert(amountForFx, amountForFxIn, getRate()) : undefined,
			}));
			return updated.slice(-5);
		});
	}, [rateLive, rateOverride, amountForFx, instrument, getRate]);

	return (
		<div className="page">
			<div className="card">
				<h1 className="title">CACIB – React Technical Test</h1>
				<p>&nbsp;</p>
				<div className="rate-grid">
					<div className="rate-col">
						<div className="rate-label">Instrument</div>
						<div className="rate-value">{instrument.base}{instrument.quote}</div>
					</div>

					<div className="rate-col">
						<div className="rate-label">Live rate</div>
						<div className="rate-value">{rateLive.toFixed(4)}</div>
					</div>

					<div className="rate-col">
						<div className="rate-label">Override rate</div>
						<input
							className="input rate-input"
							type="number"
							value={rateOverride ?? ""}
							placeholder={instrument.toString() + " override"}
							onChange={e => setRateOverride(parseFloat(e.target.value))}
							style={{
								backgroundColor:
									getPctDiff() !== undefined && getPctDiff() > maxPctDiffOverride
										? "rgba(255,0,0,0.12)"
										: "rgba(255,255,255,0.06)",
							}}
						/>
						{getPctDiff() !== undefined && getPctDiff() > maxPctDiffOverride && (
							<div className="hint">(over max % diff, live rate used)</div>
						)}
					</div>
				</div>

				<p>&nbsp;</p>
				<h2 className="section-title">Convert FX</h2>

				<div className="row">
					<input
						className="input grow"
						type="number"
						placeholder={"Amount in " + instrument.tickerOf(amountForFxIn)}
						value={amountForFx ?? ""}
						onChange={e => setAmountForFx(e.target.value !== "" ? parseFloat(e.target.value) : undefined )}
					/>
					<select
						className="select"
						value={amountForFxIn}
						onChange={(e) => onAmountForFxInChange(e.target.value as AmountType)}
					>
						{Object.values(AmountType).map((v) => (
							<option key={v} value={v}>{instrument.tickerOf(v)}</option>
						))}
					</select>
				</div>

				{amountForFx !== undefined && (<>
					<div className="result">
						<div className="result-col">
							<div className="result-amount">{amountForFx.toFixed(4)}</div>
							<div className="result-currency">{instrument.tickerOf(amountForFxIn)}</div>
						</div>
						<div className="result-equal">=</div>
						<div className="result-col">
							<div className="result-amount">{instrument.convert(amountForFx, amountForFxIn, getRate()).toFixed(4)}</div>
							<div className="result-currency">{instrument.tickerOf(oppositeOf(amountForFxIn))}</div>
						</div>
					</div>
					<button onClick={saveConversion}>Save Conversion</button>
				</>)}
				<p>&nbsp;</p>
				<h2 className="section-title">Latest Conversions</h2>
				<table className="glass-table">
					<thead>
					<tr>
						<th>Instrument</th>
						<th className="num">Live rate</th>
						<th className="num">Override</th>
						<th className="num">Amount</th>
						<th>Amount In</th>
						<th className="num">Converted</th>
					</tr>
					</thead>
					<tbody>
					{conversionsSaved.length === 0 ? (
						<tr>
							<td colSpan={6} className="empty">No conversion yet.</td>
						</tr>
					) : (
						[...conversionsSaved].reverse().map((c, idx) => (
							<tr key={idx}>
								<td>{c.instrument.toString()}</td>
								<td className="num">{c.realTimeRate.toFixed(4)}</td>
								<td className="num">{c.overrideRate !== undefined ? c.overrideRate.toFixed(4) : "--"}</td>
								<td className="num">{c.initialAmount !== undefined ? c.initialAmount.toFixed(4) : "-"}</td>
								<td>{c.instrument.tickerOf(c.amountType)}</td>
								<td className="num">
									{c.convertedAmount !== undefined
										? `${c.convertedAmount.toFixed(4)} ${c.instrument.tickerOf(oppositeOf(c.amountType))}`
										: "-"}
								</td>
							</tr>
						))
					)}
					</tbody>
				</table>


			</div>

		</div>
	)
}

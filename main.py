from data_fetcher import get_stock_data
from detector import detect_absorption, detect_vwap_signals
from scorer import calculate_score

tickers =["AAPL", "TSLA", "NVDA", "SPY", "AMD"] # added "FAKETICKER" for testing error handling

for ticker in tickers:
    try:
        print(f"\nAnalyzing ticker: {ticker}")
        df = get_stock_data(ticker)

        if len(df) == 0:
            raise ValueError(f"No data found for {ticker}")

        absorption_signals = detect_absorption(df, 20, 3, 0.002)
        vwap_signals = detect_vwap_signals(df, 20, 1.5, 0.75)
        score = calculate_score (absorption_signals, vwap_signals, len(df), absorption_signals_weight=50)

        print(f"Analyzed {len(df)} bars of {ticker}")
        print(f"Found {len(absorption_signals)} absorption signals")
        print(f"Found {len(vwap_signals)} VWAP signals")
        print(f"Hidden Liquidity Score: {score:.2f}/100")

    except Exception as e:
        print(f"Error analyzing {ticker}: {e}")

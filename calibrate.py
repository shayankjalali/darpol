from data_fetcher import get_stock_data
from detector import detect_absorption
import numpy as np

# sample tickers to calibrate against
# variety of types such as tech, meme stocks, ETFs, blue chips, and volatile assets
tickers = [
    "AAPL", "MSFT", "NVDA", "GOOGL", "META",
    "GME", "AMC",
    "SPY", "QQQ", "IWM",
    "JNJ", "KO", "WMT",
    "TSLA", "AMD", "COIN", "SQ", "SHOP"
]

results = []

for ticker in tickers:
    try:
        df = get_stock_data(ticker)
        if len(df) == 0:
            print(f"No data for {ticker}, skipping.")
            continue

        suspicious_bars = detect_absorption(df, 20, 3, 0.002)

        total_log_z = 0
        for bar in suspicious_bars:
            total_log_z += np.log(1 + bar['z_score'])

        results.append({
            'ticker': ticker,
            'suspicious_bars': len(suspicious_bars),
            'raw_score': total_log_z
        })

        print(f"{ticker}: {len(suspicious_bars)} suspicious bars, raw score = {total_log_z:.2f}")

    except Exception as e:
        print(f"Error processing {ticker}: {e}")

max_score = max(r['raw_score'] for r in results) if results else 1
print(f"\nMax raw score: {max_score:.2f}")

calibration_multiplier = 80 / max_score
# chose 80 just in case there are even more volatile stocks 
print(f"Suggested multiplier (to make max around 80): {calibration_multiplier:.2f}")

with open ('config.py', 'w') as f:
    f.write(f"# Auto-generated calibration config\n")
    f.write(f"# Last calibrated: {__import__('datetime').datetime.now()}\n\n")
    f.write(f"calibration_multiplier = {calibration_multiplier:.2f}\n")

print("Calibration complete. Config saved to config.py.")
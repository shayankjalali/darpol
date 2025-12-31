import pandas as pd
from data_fetcher import get_stock_data

def detect_absorption(df, n,  z_threshold, price_change_threshold):
    df = df.copy()
    df['date'] = df.index.date

    suspicious_bars = []

    # shifts index by 1 to exclude current row, then calculates mean of previous n volumes (inclusive of n-1)
    # creates Series of rolling averages which can be accessed within the loop per index
    rolling_average = df.groupby('date')['Volume'].apply(lambda x: x.shift(1).rolling(n).mean())
    # calculating standard deviation for potential future use in z-score based detection
    rolling_std = df.groupby('date')['Volume'].apply(lambda x: x.shift(1).rolling(n).std())

    for i in range(n, len(df)):
        current_volume = df.iloc[i]['Volume']
        avg_volume = rolling_average.iloc[i]
        std_volume = rolling_std.iloc[i]

        z_score = (current_volume - avg_volume) / std_volume if std_volume != 0 else 0

        # abs only cares about movement not direction
        price_change = abs(df.iloc[i]['Close'] - df.iloc[i]['Open'])/ df.iloc[i]['Open']

        # if the bar meets the suspicious criteria, store relevant info
        if z_score > z_threshold and price_change < price_change_threshold:
            suspicious_bars.append({
                'index': i,
                'time': df.index[i],
                'volume': current_volume,
                'avg_volume': avg_volume,
                'z_score': z_score,
                'price_change': price_change
            })

        else:
            continue

    return suspicious_bars


def detect_vwap_signals(df, n, z_far_threshold, z_close_threshold):
    df = df.copy()
    df['date'] = df.index.date
    df['typical_price'] = (df['High'] + df['Low'] + df['Close']) / 3
    df['typicalprice_x_volume'] = df['typical_price'] * df['Volume']
    daily_cumsum_typicalprice_x_volume = df.groupby('date')['typicalprice_x_volume'].cumsum()
    daily_cumsum_volume = df.groupby('date')['Volume'].cumsum()

    vwap = daily_cumsum_typicalprice_x_volume / daily_cumsum_volume

    df['deviation'] = (df['Close'] - vwap) / vwap
    # calculate the z score of the deviation column using a rolling window of n bars
    rolling_std = df.groupby('date')['deviation'].apply(lambda x: x.shift(1).rolling(n).std())
    rolling_average = df.groupby('date')['deviation'].apply(lambda x: x.shift(1).rolling(n).mean())
    z_score = (df['deviation'] - rolling_average) / rolling_std

    flagged_bars = []

    for i in range(n, len(df)):
        prev_z = abs(z_score.iloc[i-1]) if i > 0 else 0
        curr_z = abs(z_score.iloc[i])

        if prev_z > z_far_threshold and curr_z < z_close_threshold:
            flagged_bars.append({
                'index': i,
                'time': df.index[i],
                'close_price': df.iloc[i]['Close'],
                'vwap': vwap.iloc[i], # this will keep the deviation direction (positive or negative)
                'deviation': df.iloc[i]['deviation'],
                'prev_z': z_score.iloc[i-1],
                'curr_z': z_score.iloc[i],
                'direction': 'above_vwap' if df.iloc[i]['Close'] > vwap.iloc[i] else 'below_vwap',
                'volume': df.iloc[i]['Volume']
            })
        else:
            continue

    return flagged_bars
        


if __name__ == "__main__":
    absorption_signals = detect_absorption(get_stock_data("AAPL"), 20, 3, 0.002)
    print(f"Found {len(absorption_signals)} absorption signals:")
    for bar in absorption_signals:
        print(bar)

    vwap_signals = detect_vwap_signals(get_stock_data("AAPL"), 20, 1.5, 0.75)
    print(f"\nFound {len(vwap_signals)} VWAP snapback signals:")
    for bar in vwap_signals:
        print(bar)


        
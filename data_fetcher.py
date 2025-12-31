import yfinance as yf

# get data from 5 days with 5 minute intervals
def get_stock_data(ticker, period="5d", interval="5m"):
    stock = yf.Ticker(ticker)
    stock_history = stock.history(period=period, interval=interval)
    
    if stock_history.empty:
        raise ValueError(f"No data found for ticker '{ticker}'. Check if the symbol is valid.")
    
    return stock_history

def get_n_for_interval(interval):
    interval_map = {
        "1m": 1,
        "5m": 5,
        "15m": 15,
        "30m": 30,
        "1h": 60
    }

    # look up interval to get minutes per bar
    minutes_per_bar = interval_map.get(interval, 5)  # default to 5 minutes if not found

    # divide 100 by interval to get n value
    n = 100 // minutes_per_bar  # using floor division to get integer value
    
    if n < 5:
        print("Interval too large for 100-minute window. Using minimum n=5")
        n = 5

    return n

if __name__ == "__main__":
    data = get_stock_data("AAPL")
    print(data)
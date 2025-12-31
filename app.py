from flask import Flask, render_template, jsonify, request
from data_fetcher import get_stock_data, get_n_for_interval
from detector import detect_absorption, detect_vwap_signals
from scorer import calculate_score

app = Flask(__name__)

@app.route('/')
def dashboard():
    return render_template('main.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        ticker = data['ticker']
        interval = data['interval']
        period = data['period']
        weight = data['weight']
        
        df = get_stock_data(ticker, period, interval)
        n = get_n_for_interval(interval)
        
        absorption_signals = detect_absorption(df, n, 3, 0.002)
        vwap_signals = detect_vwap_signals(df, n, 1.5, 0.75)
        score = calculate_score(absorption_signals, vwap_signals, len(df), weight)
        
        # Convert numpy types to Python types for JSON
        def convert_signal(signal):
            converted = {}
            for key, value in signal.items():
                if hasattr(value, 'item'):  # numpy type
                    converted[key] = value.item()
                elif str(type(value).__name__) == 'Timestamp':
                    converted[key] = str(value)
                else:
                    converted[key] = value
            return converted
        
        absorption_clean = [convert_signal(s) for s in absorption_signals]
        vwap_clean = [convert_signal(s) for s in vwap_signals]
        
        # Get price and volume data for charts
        prices = df['Close'].tolist()
        volumes = df['Volume'].tolist()
        times = [str(t) for t in df.index.tolist()]
        
        return jsonify({
            'score': float(score),
            'absorption_count': len(absorption_signals),
            'vwap_count': len(vwap_signals),
            'absorption_signals': absorption_clean,
            'vwap_signals': vwap_clean,
            'prices': prices,
            'volumes': volumes,
            'times': times,
            'high': float(max(prices)),
            'low': float(min(prices))
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
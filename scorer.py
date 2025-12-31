import numpy as np
from config import calibration_multiplier

def calculate_score(absorption_signals, vwap_signals, total_bars, absorption_signals_weight):
    absorption_weight = absorption_signals_weight/100
    vwap_weight = (100 - absorption_signals_weight)/100
    

    if total_bars == 0:
        return 0
    
    absorption_signals_log_z = 0
    for bar in absorption_signals:
        # using log to moderate impact of extremely high z-scores
        # added 1 to prevent any log(0) issues (undefined)
        absorption_signals_log_z += np.log (1 +bar['z_score'])

    absorption_score = absorption_signals_log_z 

    vwap_signals_log_z = 0
    for bar in vwap_signals:
        vwap_signals_log_z += np.log (1 + abs(bar['prev_z'])) # use absolute z to capture both directions

    vwap_score = vwap_signals_log_z 

    final_score = (absorption_score * absorption_weight + vwap_score * vwap_weight) * calibration_multiplier

    
    if final_score > 100:
        final_score = 100
    
    return final_score
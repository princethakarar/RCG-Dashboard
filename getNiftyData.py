import yfinance as yf
import pandas as pd
import os

# ----------------------------
# Settings
# ----------------------------
ticker = "^NSEI"
data_period = "2y"  # Dynamically fetches the last 2 years of data from today

# Updated filename to reflect the dynamic data range
save_file = "Nifty_Daily_OHLC_Last_2_Years.xlsx"

# ----------------------------
# Download Data
# ----------------------------
# Replaced start/end dates with the period parameter
df = yf.download(
    ticker,
    period=data_period,
    interval="1d",
    auto_adjust=False,
    progress=False,
    group_by="column"
)

# Check if data exists
if df.empty:
    print("❌ No data found.")
    exit()

# Remove MultiIndex if present
if isinstance(df.columns, pd.MultiIndex):
    df.columns = df.columns.get_level_values(0)

# Keep required columns
df = df[["Open", "High", "Low", "Close"]]

# Convert index to Date column
df.reset_index(inplace=True)

# Format Date
df["Date"] = pd.to_datetime(df["Date"]).dt.strftime("%d-%m-%Y")

# Save to Excel
df.to_excel(save_file, index=False)

# Print summary
print("\n✅ Download Successful!")
print(f"Rows Downloaded : {len(df)}")
print(f"First Date      : {df['Date'].iloc[0]}")
print(f"Last Date       : {df['Date'].iloc[-1]}")
print(f"Saved File      : {os.path.abspath(save_file)}")
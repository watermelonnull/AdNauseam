# AdNauseam Benchmarking

Automated browsing sessions to test AdNauseam's ad detection and clicking.

## Setup

Requires [Chromium](https://www.chromium.org/) and Node.js.

```sh
# 1. Install dependencies
npm install

# 2. Build the extension (from this folder)
npm run build-ext
```

Edit `config.js` if your Chromium path differs from `/Applications/Chromium.app/Contents/MacOS/Chromium`.

## Usage

### Quick test (just opens the browser with AdNauseam)

```sh
npm run test-ext
```

### Run a benchmark

```sh
npm start
```

This reads `script.json`, visits each site, scrolls, then collects results.

## script.json

Define what sites to visit:

```json
[
  { "url": "https://www.nytimes.com",  "stay": 10 },
  { "url": "https://www.bbc.com/news", "stay": 10 }
]
```

| Field  | Description                    | Default |
|--------|--------------------------------|---------|
| `url`  | Site to visit                  | —       |
| `stay` | Seconds to spend on the page   | `10`    |

## AdNauseam settings

Place an `adn_config.json` file in this folder (exported from AdNauseam's "Back up to file" button). The `test-ext` script restores it automatically on launch.

## Results

After a benchmark run, three files are saved to `results/`:

| File | Contents |
|------|----------|
| `summary-*.md` | Human-readable summary with ads per site |
| `benchmark-*.json` | Full data (all ads, blocking stats, page visits) |
| `benchmark-*.log.txt` | Verbose log of the entire session |

Example summary:

```
BENCHMARK SUMMARY
============================================================
Duration:          5m 32s
Pages visited:     12

--- Ads ---
Total detected:    34
Clicked:           34
Click success:     100.0%

--- Ads per Site ---
Site                                Visits    Ads
--------------------------------------------------
reuters.com                              3     12
cnn.com                                  2      8
nytimes.com                              4      0
============================================================
```

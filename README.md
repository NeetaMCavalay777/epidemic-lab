# Epidemic Lab: Interactive SIR Simulator

A small Python and Flask project with an interactive website for exploring the Susceptible–Infected–Recovered (SIR) epidemic model. Adjust the population, initial infections, transmission and recovery rates, vaccination at the start, intervention timing and strength, and simulation length. The page plots all three groups and reports the infection peak, total infections, and reproduction numbers. A regional view also shows infection spreading across a schematic 6 × 6 grid; you can choose the starting region, set between-region mobility, and play or scrub through the simulated days.

This is an educational model, not a forecasting or public-health tool. It assumes a closed, well-mixed population and simplified rates.

## Run in VS Code (Windows)

1. Extract `epidemic-lab.zip` to a folder.
2. In VS Code, choose **File → Open Folder…** and open the extracted `epidemic-lab` folder.
3. Open **Terminal → New Terminal**. Make sure the terminal is in the project folder, then type:

```powershell
py -m venv .venv
```

4. Activate the environment:

```powershell
.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, use Command Prompt instead and type:

```cmd
.venv\Scripts\activate.bat
```

5. Install the packages:

```powershell
py -m pip install -r requirements.txt
```

6. Start the website:

```powershell
py app.py
```

7. Open **http://127.0.0.1:5000** in your browser. Leave the terminal running while you use the site. Press `Ctrl+C` in the terminal to stop it.

## Inputs and outputs

**Inputs:** total population, initial infected count, transmission rate (β), recovery rate (γ), starting vaccination fraction, intervention start day and transmission reduction, simulation length, map seed region, and between-region mobility.

**Outputs:** S/I/R time-series curves; peak infected count and day; total infected by the end; basic reproduction number `R₀ = β/γ`; and a day-by-day 6 × 6 regional infected-count map. Brighter red cells indicate more active infections. The map is a schematic region grid, not a real-world geography map.

## Suggested demo (3–5 minutes)

1. Start with the default values and explain the three curves: susceptible, infected, and recovered.
2. Point out the peak infections, the day of the peak, total infections, and `R₀ = β / γ`.
3. Set intervention strength to **0%**, run the simulation, and note the peak.
4. Change intervention strength to **50%** (keep intervention day at 45), run it again, and compare the peak and curve. Explain that the model reduces transmission after day 45.
5. Increase initial vaccination to **30%** and run again. Discuss how fewer susceptible people can reduce spread.
6. In the regional map, select **Northwest** as the seed, set mobility to **0%**, and press **Run simulation**. Play the map; infection stays near its initial region. Increase mobility to **20%**, run again, and play to show spread into adjacent regions.
7. Finish with a limitation: real populations are not perfectly mixed, and reported case data is incomplete. The simulation illustrates a model; it does not make real-world outbreak predictions.

## Math behind the simulation

The model tracks susceptible people `S`, infected people `I`, and recovered people `R` in a population of size `N`:

```text
dS/dt = -βSI/N
dI/dt =  βSI/N - γI
dR/dt =  γI
```

`β` is the transmission rate and `γ` is the recovery rate. The basic reproduction number is `R₀ = β/γ` under the model's assumptions. The equations are numerically integrated with SciPy's `solve_ivp`; Flask provides the simulation results to the website.

## Project files

- `app.py` — Flask server and SIR differential-equation simulation.
- `templates/index.html` — simulator layout.
- `static/app.js` — controls, API calls, and chart rendering.
- `static/style.css` — website styling.
- `requirements.txt` — Python packages.

## Where to add or change code

- Put page elements and labels in `templates/index.html`.
- Put browser interactions, map animation, and map coloring in `static/app.js`.
- Put visual styles in `static/style.css`. To use the supplied dark teal CSS, replace this file's contents with the provided CSS and keep the **Regional spread map additions** at the end.
- Put the SIR and regional equations and their API routes in `app.py`.

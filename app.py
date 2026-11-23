from flask import Flask, jsonify, render_template, request
from scipy.integrate import solve_ivp
import numpy as np

app = Flask(__name__)


def simulate(params):
    population = int(params.get("population", 100_000))
    initial_infected = int(params.get("initial_infected", 10))
    beta = float(params.get("beta", 0.30))
    gamma = float(params.get("gamma", 0.10))
    days = int(params.get("days", 180))
    intervention_day = int(params.get("intervention_day", 45))
    intervention_strength = float(params.get("intervention_strength", 0.40))
    vaccination = float(params.get("vaccination", 0.0))

    if population < 2 or not 1 <= initial_infected < population:
        raise ValueError("Initial infected must be at least 1 and less than population.")
    if not 0.01 <= beta <= 2 or not 0.01 <= gamma <= 1:
        raise ValueError("Transmission and recovery rates are outside the allowed range.")
    if not 30 <= days <= 365 or not 0 <= vaccination <= 0.90:
        raise ValueError("Choose 30–365 days and vaccination between 0% and 90%.")
    if not 0 <= intervention_strength <= 0.90:
        raise ValueError("Intervention strength must be between 0% and 90%.")

    vaccinated = int(population * vaccination)
    susceptible = population - initial_infected - vaccinated
    initial = [susceptible, float(initial_infected), float(vaccinated)]

    def rhs(t, state):
        s, i, r = state
        active_beta = beta * (1 - intervention_strength) if t >= intervention_day else beta
        new_infections = active_beta * s * i / population
        recoveries = gamma * i
        return [-new_infections, new_infections - recoveries, recoveries]

    times = list(range(days + 1))
    result = solve_ivp(rhs, (0, days), initial, t_eval=times, rtol=1e-7, atol=1e-8)
    s, i, r = result.y
    return {
        "days": times,
        "susceptible": [round(max(0, x)) for x in s],
        "infected": [round(max(0, x)) for x in i],
        "recovered": [round(max(0, x)) for x in r],
        "metrics": {
            "peak_infected": round(float(max(i))),
            "peak_day": int(times[int(i.argmax())]),
            "total_infected": round(float(population - s[-1] - vaccinated)),
            "basic_reproduction_number": round(beta / gamma, 2),
            "effective_reproduction_after_intervention": round(beta * (1 - intervention_strength) / gamma, 2),
        },
    }


@app.get("/")
def home():
    return render_template("index.html")


@app.post("/api/simulate")
def api_simulate():
    try:
        return jsonify(simulate(request.get_json(force=True)))
    except (ValueError, TypeError) as error:
        return jsonify({"error": str(error)}), 400


@app.post("/api/map-simulate")
def api_map_simulate():
    """Simulate local spread across a schematic 6-by-6 grid of regions."""
    try:
        p = request.get_json(force=True)
        population = int(p.get("population", 100_000))
        initial_infected = int(p.get("initial_infected", 10))
        beta = float(p.get("beta", 0.30))
        gamma = float(p.get("gamma", 0.10))
        days = int(p.get("days", 180))
        mobility = float(p.get("mobility", 0.12))
        seed_region = int(p.get("seed_region", 14))
        intervention_day = int(p.get("intervention_day", 45))
        intervention_strength = float(p.get("intervention_strength", 0.40))
        vaccination = float(p.get("vaccination", 0.0))
        if population < 36 or not 1 <= initial_infected < population:
            raise ValueError("For the map, population must be at least 36 and initial infected less than population.")
        if not 0.01 <= beta <= 2 or not 0.01 <= gamma <= 1 or not 30 <= days <= 365:
            raise ValueError("Choose valid rates and a simulation length from 30 to 365 days.")
        if not 0 <= mobility <= 0.5 or not 0 <= seed_region < 36 or not 0 <= vaccination <= 0.9 or not 0 <= intervention_strength <= 0.9:
            raise ValueError("Choose valid vaccination, intervention, mobility, and seed-region settings.")

        side = 6
        region_pop = population / (side * side)
        if initial_infected >= region_pop * (1 - vaccination):
            raise ValueError("The starting region must have enough unvaccinated people for the initial infections.")
        neighbors = []
        for cell in range(side * side):
            row, col = divmod(cell, side)
            neighbors.append([rr * side + cc for rr, cc in ((row - 1, col), (row + 1, col), (row, col - 1), (row, col + 1)) if 0 <= rr < side and 0 <= cc < side])
        neighbor_indices = [np.array(ns, dtype=int) for ns in neighbors]
        initial = np.zeros((3, side * side), dtype=float)
        initial[0, :] = region_pop * (1 - vaccination)
        initial[2, :] = region_pop * vaccination
        initial[1, seed_region] = initial_infected
        initial[0, seed_region] -= initial_infected

        def rhs(t, flat_state):
            state = flat_state.reshape(3, -1)
            s, i, r = state
            local_pressure = np.maximum(i, 0) / region_pop
            neighbor_pressure = np.array([local_pressure[idx].mean() if len(idx) else 0 for idx in neighbor_indices])
            force = (1 - mobility) * local_pressure + mobility * neighbor_pressure
            active_beta = beta * (1 - intervention_strength) if t >= intervention_day else beta
            new = active_beta * np.maximum(s, 0) * force
            recovery = gamma * np.maximum(i, 0)
            return np.stack([-new, new - recovery, recovery]).ravel()

        times = list(range(days + 1))
        sol = solve_ivp(rhs, (0, days), initial.ravel(), t_eval=times, rtol=1e-6, atol=1e-8)
        infected_by_day = np.maximum(sol.y[36:72, :], 0).T
        return jsonify({"days": times, "grid": infected_by_day.round().astype(int).tolist(), "rows": side, "cols": side, "region_population": round(region_pop), "seed_region": seed_region})
    except (ValueError, TypeError) as error:
        return jsonify({"error": str(error)}), 400


if __name__ == "__main__":
    app.run(debug=True)

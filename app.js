const STORAGE_KEY = "budgetbloom_state_v2";

const defaultState = {
  income: 0,
  fixed: [],
  envelopes: [],
  debts: [],
  goals: [],
  transactions: [],
  settings: {
    currencySymbol: "$",
    debtStrategy: "snowball",
    debtExtra: 0
  },
  onboardingDismissed: false
};

let state = loadState();

/* Storage */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return Object.assign(structuredClone(defaultState), parsed);
  } catch (e) {
    console.error("Error loading state", e);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* Helpers */

function formatCurrency(value) {
  const sym = state.settings.currencySymbol || "$";
  const num = Number(value) || 0;
  return sym + num.toFixed(2);
}

function sum(list, key) {
  return (list || []).reduce((acc, item) => acc + Number(item[key] || 0), 0);
}

/* NAVIGATION */

function switchView(view) {
  document.querySelectorAll(".view").forEach(v => {
    v.classList.toggle("active", v.id === `view-${view}`);
  });

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  document.querySelectorAll(".mobile-nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
}

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    switchView(btn.dataset.view);
  });
});

document.querySelectorAll(".mobile-nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    switchView(btn.dataset.view);
  });
});

/* Onboarding banner */

const banner = document.getElementById("onboarding-banner");
const dismissOnboardingBtn = document.getElementById("dismiss-onboarding");

if (state.onboardingDismissed) {
  banner.style.display = "none";
}

dismissOnboardingBtn.addEventListener("click", () => {
  banner.style.display = "none";
  state.onboardingDismissed = true;
  saveState();
});

/* INCOME & FIXED BILLS */

const incomeInput = document.getElementById("income-input");
incomeInput.value = state.income || "";

incomeInput.addEventListener("input", () => {
  state.income = Number(incomeInput.value || 0);
  saveState();
  renderBudgetSummary();
  renderDashboard();
  renderEnvelopeOverview(); // keep envelopes “Still unassigned” live
});

const fixedListEl = document.getElementById("fixed-list");
document.getElementById("add-fixed").addEventListener("click", () => {
  state.fixed.push({ name: "", amount: 0 });
  saveState();
  renderFixed();
  renderAll();
});

function renderFixed() {
  fixedListEl.innerHTML = "";
  if (!state.fixed.length) {
    fixedListEl.innerHTML = `<p class="empty-hint">No fixed bills yet. Add rent, phone, internet, etc.</p>`;
    return;
  }
  state.fixed.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <input type="text" placeholder="Name" value="${item.name || ""}" />
      <input type="number" step="0.01" value="${item.amount || ""}" />
      <button class="item-remove" title="Remove">×</button>
    `;
    const [nameInput, amountInput, removeBtn] = row.querySelectorAll("input, button");

    nameInput.addEventListener("input", () => {
      state.fixed[index].name = nameInput.value;
      saveState();
      // name doesn’t affect totals, just dashboard context
      renderDashboard();
    });
    amountInput.addEventListener("input", () => {
      state.fixed[index].amount = Number(amountInput.value || 0);
      saveState();
      renderBudgetSummary();
      renderDashboard();
      renderEnvelopeOverview();
    });
    removeBtn.addEventListener("click", () => {
      state.fixed.splice(index, 1);
      saveState();
      renderFixed();
      renderAll();
    });

    fixedListEl.appendChild(row);
  });
}

/* ENVELOPES */

const envelopeListEl = document.getElementById("envelope-list");
const envelopeOverviewEl = document.getElementById("envelope-overview");
const envelopeCardsEl = document.getElementById("envelope-cards");

document.getElementById("add-envelope").addEventListener("click", () => {
  state.envelopes.push({ name: "", budget: 0, spent: 0 });
  saveState();
  renderEnvelopes();
  renderTransactionsEnvelopeOptions();
  renderAll();
});

function renderEnvelopes() {
  envelopeListEl.innerHTML = "";
  if (!state.envelopes.length) {
    envelopeListEl.innerHTML = `<p class="empty-hint">No envelopes yet. Add categories like Groceries, Fun, Pets, etc.</p>`;
  } else {
    state.envelopes.forEach((env, index) => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `
        <input type="text" placeholder="Envelope name" value="${env.name || ""}" />
        <input type="number" step="0.01" value="${env.budget || ""}" />
        <button class="item-remove" title="Remove">×</button>
      `;
      const [nameInput, budgetInput, removeBtn] = row.querySelectorAll("input, button");

      nameInput.addEventListener("input", () => {
        state.envelopes[index].name = nameInput.value;
        saveState();
        renderTransactionsEnvelopeOptions();
        renderDashboard();
        renderEnvelopeOverview();
        renderEnvelopeCards();
        renderPetalChart();
      });
      budgetInput.addEventListener("input", () => {
        state.envelopes[index].budget = Number(budgetInput.value || 0);
        saveState();
        renderDashboard();
        renderEnvelopeOverview();
        renderEnvelopeCards();
        renderPetalChart();
      });
      removeBtn.addEventListener("click", () => {
        state.envelopes.splice(index, 1);
        saveState();
        renderEnvelopes();
        renderTransactionsEnvelopeOptions();
        renderAll();
      });

      envelopeListEl.appendChild(row);
    });
  }

  renderEnvelopeOverview();
  renderEnvelopeCards();
}

/* Envelope overview (chips + “Still unassigned”) */

function renderEnvelopeOverview() {
  envelopeOverviewEl.innerHTML = "";

  if (!state.envelopes.length) {
    envelopeOverviewEl.classList.add("empty-hint");
    envelopeOverviewEl.innerHTML = `<p>No envelopes yet.</p>`;
    return;
  }

  envelopeOverviewEl.classList.remove("empty-hint");

  const totalBudget = sum(state.envelopes, "budget");

  state.envelopes.forEach(env => {
    const chip = document.createElement("div");
    chip.className = "chip";
    const available = Number(env.budget || 0) - Number(env.spent || 0);
    chip.innerHTML = `
      <span>${env.name || "Unnamed"}</span>
      <span class="chip-amount">${formatCurrency(available)}</span>
    `;
    envelopeOverviewEl.appendChild(chip);
  });

  const note = document.createElement("p");
  note.className = "field-hint";
  const toAssign =
    (state.income || 0) - sum(state.fixed, "amount") - totalBudget;
  note.textContent =
    `Total assigned to envelopes: ${formatCurrency(totalBudget)} · ` +
    `Still unassigned: ${formatCurrency(toAssign)}`;
  envelopeOverviewEl.appendChild(note);
}

/* Debts */

const debtListEl = document.getElementById("debt-list");
const debtEstimateEl = document.getElementById("debt-estimate");

document.getElementById("add-debt").addEventListener("click", () => {
  state.debts.push({ name: "", balance: 0, minimum: 0, rate: 0 });
  saveState();
  renderDebts();
  renderAll();
});

function renderDebts() {
  debtListEl.innerHTML = "";
  if (!state.debts.length) {
    debtListEl.innerHTML = `<p class="empty-hint">No debts yet. Add credit cards, loans, etc.</p>`;
  } else {
    state.debts.forEach((debt, index) => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `
        <input type="text" placeholder="Debt name" value="${debt.name || ""}" />
        <input type="number" step="0.01" value="${debt.balance || ""}" />
        <button class="item-remove" title="Remove">×</button>
      `;
      const [nameInput, balanceInput, removeBtn] = row.querySelectorAll("input, button");

      const extraRow = document.createElement("div");
      extraRow.className = "item-row";
      extraRow.style.gridTemplateColumns = "minmax(0, 1fr) minmax(0, 1fr)";
      extraRow.innerHTML = `
        <input type="number" step="0.01" placeholder="Minimum payment" value="${debt.minimum || ""}" />
        <input type="number" step="0.01" placeholder="Interest rate % (optional)" value="${debt.rate || ""}" />
      `;
      const [minInput, rateInput] = extraRow.querySelectorAll("input");

      nameInput.addEventListener("input", () => {
        state.debts[index].name = nameInput.value;
        saveState();
        renderDashboard();
        renderDebtEstimate();
      });
      balanceInput.addEventListener("input", () => {
        state.debts[index].balance = Number(balanceInput.value || 0);
        saveState();
        renderDashboard();
        renderDebtEstimate();
      });
      minInput.addEventListener("input", () => {
        state.debts[index].minimum = Number(minInput.value || 0);
        saveState();
        renderDebtEstimate();
      });
      rateInput.addEventListener("input", () => {
        state.debts[index].rate = Number(rateInput.value || 0);
        saveState();
        renderDebtEstimate();
      });

      removeBtn.addEventListener("click", () => {
        state.debts.splice(index, 1);
        saveState();
        renderDebts();
        renderAll();
      });

      const wrap = document.createElement("div");
      wrap.appendChild(row);
      wrap.appendChild(extraRow);
      debtListEl.appendChild(wrap);
    });
  }

  renderDebtEstimate();
}

// Rough payoff simulation using snowball/avalanche strategy
function computeDebtPayoffPlan() {
  const activeDebts = state.debts
    .filter(d => Number(d.balance) > 0 && Number(d.minimum) >= 0);

  if (!activeDebts.length) return null;

  const strategy = state.settings.debtStrategy || "snowball";
  const extra = Number(state.settings.debtExtra || 0);

  // Clone so we don't mutate state during simulation
  const debts = activeDebts.map(d => ({
    name: d.name || "",
    balance: Number(d.balance || 0),
    minimum: Number(d.minimum || 0),
    rate: Number(d.rate || 0) // APR, e.g. 19.99
  }));

  const monthlyMinTotal = debts.reduce((acc, d) => acc + d.minimum, 0);
  const monthlyPaymentTotal = monthlyMinTotal + extra;

  if (monthlyPaymentTotal <= 0) {
    return {
      impossible: true,
      reason: "Monthly payments are zero. Add a minimum or extra payment."
    };
  }

  let months = 0;
  let totalInterest = 0;
  const maxMonths = 600; // hard cap ~50 years so we don't loop forever

  while (months < maxMonths) {
    // Check if all paid off
    const remaining = debts.reduce((acc, d) => acc + Math.max(0, d.balance), 0);
    if (remaining <= 0.01) break;

    months++;

    // 1) Apply interest
    debts.forEach(d => {
      if (d.balance <= 0) return;
      if (d.rate > 0) {
        const monthlyRate = d.rate / 100 / 12;
        const interest = d.balance * monthlyRate;
        d.balance += interest;
        totalInterest += interest;
      }
    });

    // 2) Sort according to strategy
    if (strategy === "avalanche") {
      debts.sort((a, b) => b.rate - a.rate); // highest rate first
    } else {
      // snowball (default): smallest balance first
      debts.sort((a, b) => a.balance - b.balance);
    }

    // 3) Pay minimums
    let paymentPool = monthlyPaymentTotal;
    debts.forEach(d => {
      if (d.balance <= 0 || paymentPool <= 0) return;
      const pay = Math.min(d.minimum, d.balance, paymentPool);
      d.balance -= pay;
      paymentPool -= pay;
    });

    // 4) Throw extra at target debts according to strategy
    debts.forEach(d => {
      if (d.balance <= 0 || paymentPool <= 0) return;
      const pay = Math.min(d.balance, paymentPool);
      d.balance -= pay;
      paymentPool -= pay;
    });

    // Safety: if nothing is changing (no minimums + no extra), bail
    const stillOwing = debts.some(d => d.balance > 0);
    if (stillOwing && monthlyPaymentTotal <= 0.0001) {
      return {
        impossible: true,
        reason: "Payments are too small to ever pay off these debts."
      };
    }
  }

  const remaining = debts.reduce((acc, d) => acc + Math.max(0, d.balance), 0);

  if (remaining > 0.01) {
    return {
      impossible: true,
      reason: "At your current payments, payoff would take more than 50 years."
    };
  }

  return {
    months,
    years: months / 12,
    totalInterest
  };
}

function renderDebtEstimate() {
  if (!state.debts.length) {
    debtEstimateEl.textContent = "No debts to estimate yet.";
    return;
  }

  const totalBalance = sum(state.debts, "balance");
  const plan = computeDebtPayoffPlan();

  // No minimums / no extra / nothing to simulate
  if (!plan) {
    debtEstimateEl.innerHTML = `
      <p>Total debt: <strong>${formatCurrency(totalBalance)}</strong></p>
      <p>Add minimum payments and (optionally) an extra payment to see an estimated payoff timeline.</p>
    `;
    return;
  }

  if (plan.impossible) {
    debtEstimateEl.innerHTML = `
      <p>Total debt: <strong>${formatCurrency(totalBalance)}</strong></p>
      <p>${plan.reason}</p>
      <p class="field-hint">Try increasing your extra payment in Settings, or raising minimums for at least one debt.</p>
    `;
    return;
  }

  const months = plan.months;
  const years = plan.years;
  const interest = plan.totalInterest;

  const yearsText = years >= 1
    ? `${years.toFixed(1)} years (${months} months)`
    : `${months} months`;

  const strategyLabel =
    (state.settings.debtStrategy === "avalanche" ? "Avalanche (highest rate first)" : "Snowball (smallest balance first)");

  debtEstimateEl.innerHTML = `
    <p>Total debt: <strong>${formatCurrency(totalBalance)}</strong></p>
    <p>With your current minimums and extra payment, your <strong>${strategyLabel}</strong> plan could pay everything off in about <strong>${yearsText}</strong>.</p>
    <p class="field-hint">Rough estimate only. Actual payoff will vary based on real-world interest, fees, and changes to your payments.</p>
    <p class="field-hint">Estimated interest over the journey: <strong>${formatCurrency(interest)}</strong>.</p>
  `;
}

/* GOALS */

const goalListEl = document.getElementById("goal-list");
const goalProgressListEl = document.getElementById("goal-progress-list");

document.getElementById("add-goal").addEventListener("click", () => {
  state.goals.push({ name: "", target: 0, current: 0 });
  saveState();
  renderGoals();
  renderAll();
});

function renderGoals() {
  goalListEl.innerHTML = "";
  if (!state.goals.length) {
    goalListEl.innerHTML = `<p class="empty-hint">No goals yet. Add an emergency fund, a trip, or something fun.</p>`;
  } else {
    state.goals.forEach((goal, index) => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `
        <input type="text" placeholder="Goal name" value="${goal.name || ""}" />
        <input type="number" step="0.01" value="${goal.target || ""}" />
        <button class="item-remove" title="Remove">×</button>
      `;
      const [nameInput, targetInput, removeBtn] = row.querySelectorAll("input, button");

      const extraRow = document.createElement("div");
      extraRow.className = "item-row";
      extraRow.style.gridTemplateColumns = "minmax(0, 1fr)";
      extraRow.innerHTML = `
        <input type="number" step="0.01" placeholder="Current saved" value="${goal.current || ""}" />
      `;
      const [currentInput] = extraRow.querySelectorAll("input");

      nameInput.addEventListener("input", () => {
        state.goals[index].name = nameInput.value;
        saveState();
        renderDashboard();
        renderBloomGarden();
        renderGoalProgressOnly();
      });
      targetInput.addEventListener("input", () => {
        state.goals[index].target = Number(targetInput.value || 0);
        saveState();
        renderDashboard();
        renderBloomGarden();
        renderGoalProgressOnly();
      });
      currentInput.addEventListener("input", () => {
        state.goals[index].current = Number(currentInput.value || 0);
        saveState();
        renderDashboard();
        renderBloomGarden();
        renderGoalProgressOnly();
      });

      removeBtn.addEventListener("click", () => {
        state.goals.splice(index, 1);
        saveState();
        renderGoals();
        renderAll();
      });

      const wrap = document.createElement("div");
      wrap.appendChild(row);
      wrap.appendChild(extraRow);
      goalListEl.appendChild(wrap);
    });
  }

  // Keep the progress card in sync too
  renderGoalProgressOnly();
}

/* Only update the “Goal Progress” card */

function renderGoalProgressOnly() {
  goalProgressListEl.innerHTML = "";
  if (!state.goals.length) {
    goalProgressListEl.classList.add("empty-hint");
    goalProgressListEl.innerHTML = `<p>No goals yet.</p>`;
  } else {
    goalProgressListEl.classList.remove("empty-hint");
    state.goals.forEach(goal => {
      const row = document.createElement("div");
      row.className = "goal-row";
      const target = Number(goal.target || 0);
      const current = Number(goal.current || 0);
      const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
      row.innerHTML = `
        <div class="mini-label">${goal.name || "Goal"}</div>
        <div class="progress-track">
          <div class="progress-bar" style="width:${pct}%;"></div>
        </div>
        <div class="progress-caption">${formatCurrency(current)} / ${formatCurrency(target)} (${pct.toFixed(0)}%)</div>
      `;
      goalProgressListEl.appendChild(row);
    });
  }
}

/* TRANSACTIONS */

const txDateInput = document.getElementById("tx-date");
const txDescInput = document.getElementById("tx-desc");
const txAmountInput = document.getElementById("tx-amount");
const txEnvelopeSelect = document.getElementById("tx-envelope");
const txListEl = document.getElementById("tx-list");

document.getElementById("add-tx").addEventListener("click", () => {
  const date = txDateInput.value || new Date().toISOString().slice(0, 10);
  const desc = txDescInput.value || "Transaction";
  const amount = Number(txAmountInput.value || 0);
  const env = txEnvelopeSelect.value || "";
  if (!amount) return;
  state.transactions.unshift({ date, desc, amount, envelope: env });

  if (env) {
    const envObj = state.envelopes.find(e => e.name === env);
    if (envObj) {
      envObj.spent = Number(envObj.spent || 0) + amount;
    }
  }

  txDescInput.value = "";
  txAmountInput.value = "";
  saveState();
  renderTransactions();
  renderEnvelopes();
  renderAll();
});

function renderTransactionsEnvelopeOptions() {
  const current = txEnvelopeSelect.value;
  txEnvelopeSelect.innerHTML = `<option value="">Uncategorized</option>`;
  state.envelopes.forEach(env => {
    if (!env.name) return;
    const opt = document.createElement("option");
    opt.value = env.name;
    opt.textContent = env.name;
    txEnvelopeSelect.appendChild(opt);
  });
  if (current) {
    txEnvelopeSelect.value = current;
  }
}

function renderTransactions() {
  txListEl.innerHTML = "";
  if (!state.transactions.length) {
    txListEl.classList.add("empty-hint");
    txListEl.innerHTML = `<p>No transactions yet.</p>`;
  } else {
    txListEl.classList.remove("empty-hint");
    state.transactions.slice(0, 40).forEach(tx => {
      const item = document.createElement("div");
      item.className = "tx-item";
      item.innerHTML = `
        <div class="tx-main">
          <span class="tx-desc">${tx.desc}</span>
          <span class="tx-meta">${tx.date}</span>
        </div>
        <div class="tx-amount">${formatCurrency(tx.amount)}</div>
      `;
      txListEl.appendChild(item);
    });
  }
}

/* SETTINGS & DATA */

const currencyInput = document.getElementById("currency-symbol");
const debtStrategySelect = document.getElementById("debt-strategy");
const debtExtraInput = document.getElementById("debt-extra");

currencyInput.value = state.settings.currencySymbol || "$";
debtStrategySelect.value = state.settings.debtStrategy || "snowball";
debtExtraInput.value = state.settings.debtExtra || "";

currencyInput.addEventListener("input", () => {
  state.settings.currencySymbol = currencyInput.value || "$";
  saveState();
  // Update all money displays
  renderDashboard();
  renderBudgetSummary();
  renderTransactions();
  renderDebtEstimate();
  renderGoalProgressOnly();
  renderEnvelopeOverview();
  renderEnvelopeCards();
});

debtStrategySelect.addEventListener("change", () => {
  state.settings.debtStrategy = debtStrategySelect.value;
  saveState();
});

debtExtraInput.addEventListener("input", () => {
  state.settings.debtExtra = Number(debtExtraInput.value || 0);
  saveState();
});

// Data export / import / reset

const exportBtn = document.getElementById("export-data");
const importInput = document.getElementById("import-file");
const resetBtn = document.getElementById("reset-data");

if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    try {
      const json = JSON.stringify(state, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "budgetbloom-data.json";

      // Helps on iOS / PWAs
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error", err);
      alert("Sorry, something went wrong exporting your data.");
    }
  });
}

if (importInput) {
  importInput.addEventListener("change", ev => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const imported = JSON.parse(e.target.result);
        state = Object.assign(structuredClone(defaultState), imported);
        saveState();
        location.reload();
      } catch (err) {
        console.error("Import error", err);
        alert("Could not import file. Please ensure it's a valid BudgetBloom JSON export.");
      }
    };
    reader.readAsText(file);
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    if (!confirm("This will clear all BudgetBloom data on this device. Continue?")) return;
    localStorage.removeItem(STORAGE_KEY);
    state = structuredClone(defaultState);
    location.reload();
  });
}

/* DASHBOARD & SUMMARY */

function renderDashboard() {
  const income = state.income || 0;
  const fixedTotal = sum(state.fixed, "amount");
  const toAssign = income - fixedTotal;

  document.getElementById("dash-income").textContent = formatCurrency(income);
  document.getElementById("dash-fixed").textContent = formatCurrency(fixedTotal);
  document.getElementById("dash-to-assign").textContent = formatCurrency(toAssign);

  // Envelope snapshot
  const envList = document.getElementById("dash-envelope-list");
  envList.innerHTML = "";
  if (!state.envelopes.length) {
    envList.classList.add("empty-hint");
    envList.innerHTML = `<p>No envelopes yet.</p>`;
  } else {
    envList.classList.remove("empty-hint");
    state.envelopes.forEach(env => {
      const avail = Number(env.budget || 0) - Number(env.spent || 0);
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.innerHTML = `
        <span>${env.name || "Envelope"}</span>
        <span class="chip-amount">${formatCurrency(avail)}</span>
      `;
      envList.appendChild(chip);
    });
  }

  const debtTotal = sum(state.debts, "balance");
  const goalsTotal = sum(state.goals, "target");
  document.getElementById("dash-debt-total").textContent = formatCurrency(debtTotal);
  document.getElementById("dash-goal-total").textContent = formatCurrency(goalsTotal);

  const progressEl = document.getElementById("dash-progress");
  progressEl.innerHTML = "";
  if (debtTotal > 0) {
    const row = document.createElement("div");
    row.className = "progress-row";
    row.innerHTML = `
      <div class="progress-label">Debt Journey</div>
      <div class="progress-track">
        <div class="progress-bar" style="width:${Math.min(100, 20)}%;"></div>
      </div>
      <div class="progress-caption">Every payment nudges this bar a little further. 🌿</div>
    `;
    progressEl.appendChild(row);
  }
  if (state.goals.length > 0) {
    const targetSum = sum(state.goals, "target");
    const currentSum = state.goals.reduce((acc, g) => acc + Number(g.current || 0), 0);
    const pct = targetSum > 0 ? Math.min(100, (currentSum / targetSum) * 100) : 0;
    const row = document.createElement("div");
    row.className = "progress-row";
    row.innerHTML = `
      <div class="progress-label">Savings Garden</div>
      <div class="progress-track">
        <div class="progress-bar" style="width:${pct}%;"></div>
      </div>
      <div class="progress-caption">${formatCurrency(currentSum)} saved across all goals (${pct.toFixed(0)}%).</div>
    `;
    progressEl.appendChild(row);
  }

  renderBloomGarden();
  renderPetalChart();
}

/* Budget summary */

function renderBudgetSummary() {
  const income = state.income || 0;
  const fixedTotal = sum(state.fixed, "amount");
  const toAssign = income - fixedTotal;
  document.getElementById("budget-income").textContent = formatCurrency(income);
  document.getElementById("budget-fixed").textContent = formatCurrency(fixedTotal);
  document.getElementById("budget-to-assign").textContent = formatCurrency(toAssign);
}

/* Bloom Garden */

function renderBloomGarden() {
  const bloomSvg = document.getElementById("bloom-garden");
  const caption = document.getElementById("garden-caption");
  if (!bloomSvg || !caption) return;

  bloomSvg.innerHTML = "";

  const totalTarget = sum(state.goals, "target");
  const currentSaved = state.goals.reduce((acc, g) => acc + Number(g.current || 0), 0);
  let pct = 0;
  if (totalTarget > 0) pct = Math.min(100, (currentSaved / totalTarget) * 100);

  const NS = "http://www.w3.org/2000/svg";
  const cx = 60;
  const groundY = 135;

  const ground = document.createElementNS(NS, "rect");
  ground.setAttribute("x", "0");
  ground.setAttribute("y", String(groundY));
  ground.setAttribute("width", "120");
  ground.setAttribute("height", "25");
  ground.setAttribute("fill", "#f1e0c7");
  bloomSvg.appendChild(ground);

  const stem = document.createElementNS(NS, "rect");
  stem.setAttribute("x", String(cx - 2));
  stem.setAttribute("y", String(groundY - 70));
  stem.setAttribute("width", "4");
  stem.setAttribute("height", "70");
  stem.setAttribute("rx", "2");
  stem.setAttribute("fill", "#4a8f4a");
  bloomSvg.appendChild(stem);

  const leaf = document.createElementNS(NS, "ellipse");
  leaf.setAttribute("cx", String(cx + 14));
  leaf.setAttribute("cy", String(groundY - 35));
  leaf.setAttribute("rx", "10");
  leaf.setAttribute("ry", "6");
  leaf.setAttribute("fill", "#7fbf7b");
  bloomSvg.appendChild(leaf);

  const baseRadius = 10;
  const extraRadius = (pct / 100) * 14;
  const bloomR = baseRadius + extraRadius;

  const bloom = document.createElementNS(NS, "circle");
  bloom.setAttribute("cx", String(cx));
  bloom.setAttribute("cy", String(groundY - 80));
  bloom.setAttribute("r", String(bloomR));
  bloom.setAttribute("fill", "#ffd27f");
  bloomSvg.appendChild(bloom);

  const center = document.createElementNS(NS, "circle");
  center.setAttribute("cx", String(cx));
  center.setAttribute("cy", String(groundY - 80));
  center.setAttribute("r", String(bloomR * 0.45));
  center.setAttribute("fill", "#ffb74d");
  bloomSvg.appendChild(center);

  if (!state.goals.length || totalTarget === 0) {
    caption.textContent = "Add savings goals to start growing your bloom garden.";
  } else {
    caption.textContent = `Your savings garden is ${pct.toFixed(
      0
    )}% in bloom (${formatCurrency(currentSaved)} saved).`;
  }

  bloomSvg.classList.remove("grow-animate");
  setTimeout(() => bloomSvg.classList.add("grow-animate"), 50);
}

/* Petal Chart */

function renderPetalChart() {
  const svg = document.getElementById("petal-chart");
  if (!svg) return;

  svg.innerHTML = "";
  const NS = "http://www.w3.org/2000/svg";
  const cx = 80;
  const cy = 80;

  const envs = state.envelopes.filter(e => e && e.name);
  if (!envs.length) {
    const txt = document.createElementNS(NS, "text");
    txt.setAttribute("x", String(cx));
    txt.setAttribute("y", String(cy));
    txt.setAttribute("text-anchor", "middle");
    txt.setAttribute("dominant-baseline", "middle");
    txt.setAttribute("fill", "#a38f76");
    txt.setAttribute("font-size", "10");
    txt.textContent = "Add envelopes";
    svg.appendChild(txt);
    return;
  }

  const maxPetalLength = 45;
  const basePetalLength = 18;

  envs.forEach((env, index) => {
    const budget = Number(env.budget || 0);
    const spent = Number(env.spent || 0);
    let usedPct = 0;
    if (budget > 0) usedPct = Math.min(100, (spent / budget) * 100);

    const angle = (index / envs.length) * Math.PI * 2 - Math.PI / 2;
    const length = basePetalLength + (usedPct / 100) * maxPetalLength;

    const x2 = cx + Math.cos(angle) * length;
    const y2 = cy + Math.sin(angle) * length;

    let color = "#a5d6a7";
    if (usedPct >= 90) color = "#ef9a9a";
    else if (usedPct >= 70) color = "#ffcc80";

    const petal = document.createElementNS(NS, "line");
    petal.setAttribute("x1", String(cx));
    petal.setAttribute("y1", String(cy));
    petal.setAttribute("x2", String(x2));
    petal.setAttribute("y2", String(y2));
    petal.setAttribute("stroke", color);
    petal.setAttribute("stroke-width", "12");
    petal.setAttribute("stroke-linecap", "round");

    svg.appendChild(petal);
  });

  const center = document.createElementNS(NS, "circle");
  center.setAttribute("cx", String(cx));
  center.setAttribute("cy", String(cy));
  center.setAttribute("r", "14");
  center.setAttribute("fill", "#7cb98b");
  svg.appendChild(center);
}

/* Cozy Envelope Cards */

function renderEnvelopeCards() {
  if (!envelopeCardsEl) return;

  envelopeCardsEl.innerHTML = "";

  if (!state.envelopes.length) {
    envelopeCardsEl.classList.add("empty-hint");
    envelopeCardsEl.innerHTML = `<p>No envelopes yet. Add one above to see it here.</p>`;
    return;
  }

  envelopeCardsEl.classList.remove("empty-hint");

  state.envelopes.forEach(env => {
    const name = env.name || "Envelope";
    const budget = Number(env.budget || 0);
    const spent = Number(env.spent || 0);
    const available = budget - spent;
    let usedPct = 0;
    if (budget > 0) usedPct = Math.min(100, (spent / budget) * 100);

    const card = document.createElement("div");
    card.className = "envelope-card";

    card.innerHTML = `
      <div class="envelope-main">
        <div class="envelope-name">${name}</div>
        <div class="envelope-amounts">
          <span>${formatCurrency(spent)} spent</span>
          <span>${formatCurrency(Math.max(0, available))} left</span>
        </div>
        <div class="envelope-bar">
          <div class="envelope-bar-fill" style="width:${Math.min(100, usedPct)}%;"></div>
        </div>
      </div>
    `;

    envelopeCardsEl.appendChild(card);
  });
}

/* Main render */

function renderAll() {
  renderFixed();
  renderEnvelopes();
  renderDebts();
  renderGoals();
  renderTransactionsEnvelopeOptions();
  renderTransactions();
  renderDashboard();
  renderBudgetSummary();
}

/* Initial render */

renderAll();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch(err => {
        console.log("SW registration failed:", err);
      });
  });
}

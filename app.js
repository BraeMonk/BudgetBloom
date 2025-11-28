// BudgetBloom - soft & cozy budgeting PWA
const STORAGE_KEY = "budgetbloom_state_v1";

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

// ---- storage ----
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return structuredClone(defaultState);
    }
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

// ---- helpers ----
function formatCurrency(value) {
  const sym = state.settings.currencySymbol || "$";
  const num = Number(value) || 0;
  return sym + num.toFixed(2);
}

function sum(list, key) {
  return (list || []).reduce((acc, item) => acc + (Number(item[key] || 0)), 0);
}

// ---- nav / views ----
document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById(`view-${view}`).classList.add("active");
  });
});

// MOBILE NAV HANDLING
document.querySelectorAll(".mobile-nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;

    // sync view switching
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById(`view-${view}`).classList.add("active");

    // sync bottom nav "active" state
    document.querySelectorAll(".mobile-nav-item").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // sync sidebar nav active state for consistency
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    const sidebarBtn = document.querySelector(`.nav-item[data-view="${view}"]`);
    if (sidebarBtn) sidebarBtn.classList.add("active");
  });
});

// iOS-style hide-on-scroll for mobile bottom nav
(function () {
  const mobileNav = document.querySelector(".mobile-nav");
  if (!mobileNav) return;

  let lastScrollY = window.scrollY;
  let ticking = false;

  function onScroll() {
    const current = window.scrollY;
    const delta = current - lastScrollY;
    const isMobile = window.matchMedia("(max-width: 880px)").matches;

    if (!isMobile) {
      // Always show on desktop
      mobileNav.classList.remove("mobile-nav--hidden");
      lastScrollY = current;
      return;
    }

    // Ignore tiny scroll jitter
    if (Math.abs(delta) < 8) {
      lastScrollY = current;
      return;
    }

    if (delta > 0 && current > 40) {
      // Scrolling down & not at very top → hide
      mobileNav.classList.add("mobile-nav--hidden");
    } else {
      // Scrolling up or near top → show
      mobileNav.classList.remove("mobile-nav--hidden");
    }

    lastScrollY = current;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        onScroll();
        ticking = false;
      });
      ticking = true;
    }
  });
})();

// Onboarding banner
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

// ---- Income & fixed bills ----
const incomeInput = document.getElementById("income-input");
incomeInput.value = state.income || "";
incomeInput.addEventListener("input", () => {
  state.income = Number(incomeInput.value || 0);
  saveState();
  renderAll();
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
      renderAll();
    });
    amountInput.addEventListener("input", () => {
      state.fixed[index].amount = Number(amountInput.value || 0);
      saveState();
      renderAll();
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

// ---- Envelopes ----
const envelopeListEl = document.getElementById("envelope-list");
const envelopeOverviewEl = document.getElementById("envelope-overview");
document.getElementById("add-envelope").addEventListener("click", () => {
  state.envelopes.push({ name: "", budget: 0, spent: 0 });
  saveState();
  renderEnvelopes();
  renderAll();
});

function renderEnvelopes() {
  envelopeListEl.innerHTML = "";
  if (state.envelopes.length === 0) {
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
        renderAll();
      });
      budgetInput.addEventListener("input", () => {
        state.envelopes[index].budget = Number(budgetInput.value || 0);
        saveState();
        renderAll();
      });
      removeBtn.addEventListener("click", () => {
        const removedName = state.envelopes[index].name;
        state.envelopes.splice(index, 1);
        // If transactions reference this envelope name, they stay but will show as plain text
        saveState();
        renderEnvelopes();
        renderTransactionsEnvelopeOptions();
        renderAll();
      });
      envelopeListEl.appendChild(row);
    });
  }

  // Overview chips
  envelopeOverviewEl.innerHTML = "";
  if (state.envelopes.length === 0) {
    envelopeOverviewEl.classList.add("empty-hint");
    envelopeOverviewEl.innerHTML = `<p>No envelopes yet.</p>`;
  } else {
    envelopeOverviewEl.classList.remove("empty-hint");
    let totalBudget = sum(state.envelopes, "budget");
    let totalSpent = sum(state.envelopes, "spent");
    state.envelopes.forEach(env => {
      const chip = document.createElement("div");
      chip.className = "chip";
      const available = (Number(env.budget || 0) - Number(env.spent || 0));
      chip.innerHTML = `
        <span>${env.name || "Unnamed"}</span>
        <span class="chip-amount">${formatCurrency(available)}</span>
      `;
      envelopeOverviewEl.appendChild(chip);
    });
    // Add a soft note about total assigned vs to assign
    const note = document.createElement("p");
    note.className = "field-hint";
    const toAssign = (state.income || 0) - sum(state.fixed, "amount") - totalBudget;
    note.textContent = `Total assigned to envelopes: ${formatCurrency(totalBudget)} · Still unassigned: ${formatCurrency(toAssign)}`;
    envelopeOverviewEl.appendChild(note);
  }
}

// ---- Debts ----
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
  if (state.debts.length === 0) {
    debtListEl.innerHTML = `<p class="empty-hint">No debts added yet. Add credit cards, loans, etc.</p>`;
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

      // Minimum and rate inline under the row
      const extraRow = document.createElement("div");
      extraRow.style.display = "grid";
      extraRow.style.gridTemplateColumns = "minmax(0, 1fr) minmax(0, 1fr)";
      extraRow.style.gap = "8px";
      extraRow.style.margin = "4px 0 10px";
      extraRow.innerHTML = `
        <input type="number" step="0.01" placeholder="Minimum payment" value="${debt.minimum || ""}" />
        <input type="number" step="0.01" placeholder="Interest rate % (optional)" value="${debt.rate || ""}" />
      `;

      const [minInput, rateInput] = extraRow.querySelectorAll("input");

      nameInput.addEventListener("input", () => {
        state.debts[index].name = nameInput.value;
        saveState();
        renderAll();
      });
      balanceInput.addEventListener("input", () => {
        state.debts[index].balance = Number(balanceInput.value || 0);
        saveState();
        renderAll();
      });
      minInput.addEventListener("input", () => {
        state.debts[index].minimum = Number(minInput.value || 0);
        saveState();
        renderAll();
      });
      rateInput.addEventListener("input", () => {
        state.debts[index].rate = Number(rateInput.value || 0);
        saveState();
        renderAll();
      });

      removeBtn.addEventListener("click", () => {
        state.debts.splice(index, 1);
        saveState();
        renderDebts();
        renderAll();
      });

      const wrapper = document.createElement("div");
      wrapper.appendChild(row);
      wrapper.appendChild(extraRow);
      debtListEl.appendChild(wrapper);
    });
  }

  renderDebtEstimate();
}

function renderDebtEstimate() {
  if (state.debts.length === 0) {
    debtEstimateEl.innerHTML = `<p>No debts to estimate yet.</p>`;
    return;
  }
  const monthlyExtra = Number(state.settings.debtExtra || 0);
  const strategy = state.settings.debtStrategy || "snowball";

  // Simple payoff estimation: simulate monthly payments without compounding interest (gentle approximation).
  const snapshot = state.debts
    .filter(d => d.balance > 0)
    .map(d => ({
      name: d.name || "Debt",
      balance: Number(d.balance || 0),
      minimum: Number(d.minimum || 0),
      rate: Number(d.rate || 0)
    }));

  if (snapshot.length === 0) {
    debtEstimateEl.innerHTML = `<p>All debts are at 0. 🎉</p>`;
    return;
  }

  let months = 0;
  const maxMonths = 600; // safety
  while (months < maxMonths) {
    // sort per strategy
    snapshot.sort((a, b) => {
      if (strategy === "snowball") {
        return a.balance - b.balance;
      } else {
        // avalanche: use rate, fallback to balance
        if (b.rate !== a.rate) return b.rate - a.rate;
        return b.balance - a.balance;
      }
    });

    let extraRemaining = monthlyExtra;
    let anyBalance = false;
    for (const d of snapshot) {
      if (d.balance <= 0) continue;
      anyBalance = true;
      const minPay = d.minimum;
      let pay = minPay;
      if (extraRemaining > 0) {
        const extra = Math.min(extraRemaining, d.balance - pay);
        if (extra > 0) {
          pay += extra;
          extraRemaining -= extra;
        }
      }
      if (pay <= 0) {
        // no payment, break to avoid infinite loop
        anyBalance = true;
        break;
      }
      d.balance -= pay;
      if (d.balance < 0) d.balance = 0;
    }
    months++;
    if (!anyBalance) break;
  }

  if (months >= maxMonths) {
    debtEstimateEl.innerHTML = `<p>Based on your current minimums and extra payment, payoff could take a very long time. Try increasing the extra payment.</p>`;
  } else {
    const years = (months / 12);
    debtEstimateEl.innerHTML = `
      <p>With your current minimums and an extra <strong>${formatCurrency(state.settings.debtExtra || 0)}</strong> per month using <strong>${strategy === "snowball" ? "Snowball" : "Avalanche"}</strong>,</p>
      <p>you could be debt-free in approximately <strong>${months}</strong> month(s) (~${years.toFixed(1)} year(s)).</p>
    `;
  }
}

// ---- Goals ----
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
  if (state.goals.length === 0) {
    goalListEl.innerHTML = `<p class="empty-hint">No goals yet. Add things like Emergency Fund, Travel, New Console, etc.</p>`;
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
      extraRow.style.display = "grid";
      extraRow.style.gridTemplateColumns = "minmax(0, 1fr)";
      extraRow.style.gap = "6px";
      extraRow.style.margin = "4px 0 10px";
      extraRow.innerHTML = `
        <input type="number" step="0.01" placeholder="Current saved" value="${goal.current || ""}" />
      `;
      const [currentInput] = extraRow.querySelectorAll("input");

      nameInput.addEventListener("input", () => {
        state.goals[index].name = nameInput.value;
        saveState();
        renderAll();
      });
      targetInput.addEventListener("input", () => {
        state.goals[index].target = Number(targetInput.value || 0);
        saveState();
        renderAll();
      });
      currentInput.addEventListener("input", () => {
        state.goals[index].current = Number(currentInput.value || 0);
        saveState();
        renderAll();
      });

      removeBtn.addEventListener("click", () => {
        state.goals.splice(index, 1);
        saveState();
        renderGoals();
        renderAll();
      });

      const wrapper = document.createElement("div");
      wrapper.appendChild(row);
      wrapper.appendChild(extraRow);
      goalListEl.appendChild(wrapper);
    });
  }

  // Progress list
  goalProgressListEl.innerHTML = "";
  if (state.goals.length === 0) {
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

// ---- Transactions ----
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
  if (!amount) {
    return;
  }
  state.transactions.unshift({
    date,
    desc,
    amount,
    envelope: env
  });
  // Apply to envelope spent if envelope chosen
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
  if (state.transactions.length === 0) {
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
        <div class="tx-envelope-label">${tx.envelope || ""}</div>
      `;
      txListEl.appendChild(item);
    });
  }
}

// ---- Settings & Data ----
const currencyInput = document.getElementById("currency-symbol");
const debtStrategySelect = document.getElementById("debt-strategy");
const debtExtraInput = document.getElementById("debt-extra");

currencyInput.value = state.settings.currencySymbol;
debtStrategySelect.value = state.settings.debtStrategy;
debtExtraInput.value = state.settings.debtExtra || "";

currencyInput.addEventListener("input", () => {
  state.settings.currencySymbol = currencyInput.value || "$";
  saveState();
  renderAll();
});
debtStrategySelect.addEventListener("change", () => {
  state.settings.debtStrategy = debtStrategySelect.value;
  saveState();
  renderDebtEstimate();
});
debtExtraInput.addEventListener("input", () => {
  state.settings.debtExtra = Number(debtExtraInput.value || 0);
  saveState();
  renderDebtEstimate();
});

// export / import
document.getElementById("export-data").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "budgetbloom-data.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("import-file").addEventListener("change", ev => {
  const file = ev.target.files[0];
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

// reset
document.getElementById("reset-data").addEventListener("click", () => {
  if (!confirm("This will clear all BudgetBloom data on this device. Continue?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = structuredClone(defaultState);
  location.reload();
});

// ---- Dashboard rendering ----
function renderDashboard() {
  const income = state.income || 0;
  const fixedTotal = sum(state.fixed, "amount");
  const toAssign = income - fixedTotal;

  document.getElementById("dash-income").textContent = formatCurrency(income);
  document.getElementById("dash-fixed").textContent = formatCurrency(fixedTotal);
  document.getElementById("dash-to-assign").textContent = formatCurrency(toAssign);

  // Envelope snapshot chips
  const envList = document.getElementById("dash-envelope-list");
  envList.innerHTML = "";
  if (state.envelopes.length === 0) {
    envList.classList.add("empty-hint");
    envList.innerHTML = `<p>No envelopes yet.</p>`;
  } else {
    envList.classList.remove("empty-hint");
    state.envelopes.forEach(env => {
      const avail = (Number(env.budget || 0) - Number(env.spent || 0));
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.innerHTML = `<span>${env.name || "Envelope"}</span> <span class="chip-amount">${formatCurrency(avail)}</span>`;
      envList.appendChild(chip);
    });
  }

  // Debt & goals snapshot
  const debtTotal = sum(state.debts, "balance");
  const goalsTotal = sum(state.goals, "target");
  document.getElementById("dash-debt-total").textContent = formatCurrency(debtTotal);
  document.getElementById("dash-goal-total").textContent = formatCurrency(goalsTotal);

  const progressEl = document.getElementById("dash-progress");
  progressEl.innerHTML = "";
  if (debtTotal > 0) {
    const row = document.createElement("div");
    row.className = "progress-row";
    const paid = 0; // we don't track paid, so just show current situation
    row.innerHTML = `
      <div class="progress-label">Debt Journey</div>
      <div class="progress-track">
        <div class="progress-bar" style="width:${Math.min(100, 15)}%;"></div>
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
}

// ---- Budget view summary ----
function renderBudgetSummary() {
  const income = state.income || 0;
  const fixedTotal = sum(state.fixed, "amount");
  const toAssign = income - fixedTotal;
  document.getElementById("budget-income").textContent = formatCurrency(income);
  document.getElementById("budget-fixed").textContent = formatCurrency(fixedTotal);
  document.getElementById("budget-to-assign").textContent = formatCurrency(toAssign);
}

// ---- Main render ----
function renderAll() {
  renderDashboard();
  renderBudgetSummary();
}

// ---- initial render ----
renderFixed();
renderEnvelopes();
renderDebts();
renderGoals();
renderTransactionsEnvelopeOptions();
renderTransactions();
renderAll();

// ---- Simple service worker registration ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(err => {
      console.log("SW registration failed", err);
    });
  });
}

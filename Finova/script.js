
const STORAGE_KEY = "finova-transactions-v1";

const $ = (selector) => document.querySelector(selector);

const elements = {
  balance: $("#balance"),
  income: $("#income"),
  expenses: $("#expenses"),
  form: $("#transaction-form"),
  description: $("#description"),
  amount: $("#amount"),
  type: $("#type"),
  category: $("#category"),
  filter: $("#filter"),
  list: $("#transaction-list"),
  chart: $("#chart"),
  chartNote: $("#chart-note"),
  message: $("#form-message"),
};

const currency = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
});

const dateFormatter = new Intl.DateTimeFormat("el-GR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function makeId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createDemoTransactions() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const day = (offset) => {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    return date.toISOString().slice(0, 10);
  };

  return [
    {
      id: makeId(),
      description: "Monthly salary",
      amount: 2400,
      type: "income",
      category: "Salary",
      date: day(0),
    },
    {
      id: makeId(),
      description: "Supermarket",
      amount: 68.5,
      type: "expense",
      category: "Food",
      date: day(0),
    },
    {
      id: makeId(),
      description: "Freelance project",
      amount: 350,
      type: "income",
      category: "Freelance",
      date: day(-2),
    },
    {
      id: makeId(),
      description: "Monthly transport",
      amount: 42,
      type: "expense",
      category: "Transport",
      date: day(-3),
    },
    {
      id: makeId(),
      description: "Electricity bill",
      amount: 85.2,
      type: "expense",
      category: "Bills",
      date: day(-5),
    },
    {
      id: makeId(),
      description: "Online shopping",
      amount: 59.9,
      type: "expense",
      category: "Shopping",
      date: day(-7),
    },
  ];
}

function isValidTransaction(item) {
  return (
    item &&
    typeof item.id === "string" &&
    typeof item.description === "string" &&
    item.description.length <= 80 &&
    Number.isFinite(item.amount) &&
    item.amount > 0 &&
    item.amount <= 100000000 &&
    ["income", "expense"].includes(item.type) &&
    typeof item.category === "string" &&
    typeof item.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
    !Number.isNaN(Date.parse(`${item.date}T12:00:00`))
  );
}

function loadTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved === null) {
      const demo = createDemoTransactions();
      saveTransactions(demo);
      return demo;
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid transaction data");
    }

    return parsed.filter(isValidTransaction);
  } catch (error) {
    console.error("Could not load transactions:", error);
    elements.message.textContent =
      "Could not load saved data. Check browser storage.";
    return [];
  }
}

function saveTransactions(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch (error) {
    console.error("Could not save transactions:", error);
    elements.message.textContent =
      "Could not save changes. Check browser storage.";
    return false;
  }
}

let transactions = loadTransactions();

function getTotals(items = transactions) {
  return items.reduce(
    (totals, item) => {
      if (item.type === "income") {
        totals.income += item.amount;
      } else {
        totals.expenses += item.amount;
      }

      return totals;
    },
    { income: 0, expenses: 0 },
  );
}

function formatMoney(amount) {
  return currency.format(amount);
}

function formatDate(date) {
  return dateFormatter.format(
    new Date(`${date}T12:00:00`),
  );
}

function renderSummary() {
  const { income, expenses } = getTotals();

  elements.balance.textContent = formatMoney(income - expenses);
  elements.income.textContent = formatMoney(income);
  elements.expenses.textContent = formatMoney(expenses);
}

function renderTransactions() {
  const filter = elements.filter.value;

  const filtered = transactions
    .filter((item) => filter === "all" || item.type === filter)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  elements.list.replaceChildren();

  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No transactions found. Add your first one!";
    elements.list.append(empty);
    return;
  }

  filtered.forEach((item) => {
    const row = document.createElement("article");
    row.className = "transaction-row";

    const info = document.createElement("div");
    info.className = "transaction-info";

    const symbol = document.createElement("span");
    symbol.className = "transaction-symbol";
    symbol.textContent = item.type === "income" ? "↙" : "↗";

    const details = document.createElement("div");

    const name = document.createElement("div");
    name.className = "transaction-name";
    name.textContent = item.description;

    const meta = document.createElement("div");
    meta.className = "transaction-meta";
    meta.textContent = `${item.category} · ${formatDate(item.date)}`;

    details.append(name, meta);
    info.append(symbol, details);

    const actions = document.createElement("div");
    actions.className = "transaction-actions";

    const amount = document.createElement("span");
    amount.className = `transaction-amount ${
      item.type === "income" ? "amount-income" : "amount-expense"
    }`;

    const sign = item.type === "income" ? "+" : "−";
    amount.textContent = `${sign}${formatMoney(item.amount)}`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "×";
    deleteButton.setAttribute(
      "aria-label",
      `Delete ${item.description}`,
    );
    deleteButton.addEventListener("click", () => {
      deleteTransaction(item.id);
    });

    actions.append(amount, deleteButton);
    row.append(info, actions);
    elements.list.append(row);
  });
}

function getMonthlyData() {
  const now = new Date();
  const months = [];

  for (let offset = 5; offset >= 0; offset--) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - offset,
      1,
    );

    months.push({
      key: `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("en", {
        month: "short",
      }).format(date),
      income: 0,
      expenses: 0,
    });
  }

  const byKey = new Map(months.map((month) => [month.key, month]));

  transactions.forEach((item) => {
    const month = byKey.get(item.date.slice(0, 7));

    if (!month) return;

    if (item.type === "income") {
      month.income += item.amount;
    } else {
      month.expenses += item.amount;
    }
  });

  return months;
}

function renderChart() {
  const months = getMonthlyData();
  const maximum = Math.max(
    1,
    ...months.flatMap((month) => [month.income, month.expenses]),
  );

  elements.chart.replaceChildren();

  months.forEach((month) => {
    const column = document.createElement("div");
    column.className = "chart-column";

    const bars = document.createElement("div");
    bars.className = "chart-bars";

    [
      { value: month.income, type: "income-bar", label: "Income" },
      { value: month.expenses, type: "expense-bar", label: "Expenses" },
    ].forEach((item) => {
      const bar = document.createElement("div");
      bar.className = `chart-bar ${item.type}`;

      const height = item.value === 0
        ? 2
        : Math.max(5, (item.value / maximum) * 100);

      bar.style.height = `${height}%`;
      bar.title = `${item.label}: ${formatMoney(item.value)}`;

      bars.append(bar);
    });

    const label = document.createElement("span");
    label.className = "chart-month";
    label.textContent = month.label;

    column.append(bars, label);
    elements.chart.append(column);
  });

  const { income, expenses } = getTotals();

  elements.chartNote.textContent =
    `All-time totals: ${formatMoney(income)} income · ` +
    `${formatMoney(expenses)} expenses. Bars show the last 6 months.`;
}

function render() {
  renderSummary();
  renderTransactions();
  renderChart();
}

function deleteTransaction(id) {
  const updated = transactions.filter((item) => item.id !== id);

  if (updated.length === transactions.length) return;

  if (!saveTransactions(updated)) return;

  transactions = updated;
  elements.message.textContent = "Transaction deleted.";
  render();
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();

  const description = elements.description.value.trim();
  const amount = Number(elements.amount.value);

  if (
    !description ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 100000000
  ) {
    elements.message.textContent =
      "Enter a description and a valid positive amount.";
    return;
  }

  const transaction = {
    id: makeId(),
    description,
    amount: Math.round((amount + Number.EPSILON) * 100) / 100,
    type: elements.type.value,
    category: elements.category.value,
    date: new Date().toISOString().slice(0, 10),
  };

  if (!isValidTransaction(transaction)) {
    elements.message.textContent = "Please check the transaction details.";
    return;
  }

  const updated = [...transactions, transaction];

  if (!saveTransactions(updated)) return;

  transactions = updated;
  elements.form.reset();
  elements.message.textContent = "Transaction added successfully!";
  render();
});

elements.filter.addEventListener("change", renderTransactions);

render();

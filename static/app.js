const expressionEl = document.querySelector("#expression");
const resultEl = document.querySelector("#result");
const historyList = document.querySelector("#historyList");
const toast = document.querySelector("#toast");
const memoryLabel = document.querySelector("#memoryLabel");
const modeLabel = document.querySelector("#modeLabel");

let expression = "";
let lastResult = "0";
let memory = 0;
let mode = "standard";
let history = [];

const functionMap = {
  sin: "Math.sin",
  cos: "Math.cos",
  tan: "Math.tan",
  asin: "Math.asin",
  acos: "Math.acos",
  atan: "Math.atan",
  sqrt: "Math.sqrt",
  log: "Math.log10",
  ln: "Math.log",
  abs: "Math.abs",
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1600);
}

function displayExpression(value) {
  return (value || "0")
    .replaceAll("*", "×")
    .replaceAll("/", "÷")
    .replaceAll("pi", "π");
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    throw new Error("Result is undefined");
  }

  const abs = Math.abs(value);
  if ((abs >= 1e12 || (abs > 0 && abs < 1e-8))) {
    return value.toExponential(8).replace(/\.?0+e/, "e");
  }

  return Number.parseFloat(value.toPrecision(12)).toLocaleString("en-US", {
    maximumFractionDigits: 10,
  });
}

function normalizeForEvaluation(raw) {
  let safe = raw
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .replaceAll("^", "**")
    .replaceAll("π", "pi")
    .replace(/\bpi\b/g, "Math.PI")
    .replace(/\be\b/g, "Math.E")
    .replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");

  for (const [name, replacement] of Object.entries(functionMap)) {
    safe = safe.replace(new RegExp(`\\b${name}\\s*\\(`, "g"), `${replacement}(`);
  }

  if (!/^[0-9+\-*/().,\s%MEathPIlognscqrtabpi**]+$/.test(safe)) {
    throw new Error("Unsupported input");
  }

  return safe;
}

function calculate(raw = expression) {
  if (!raw.trim()) return 0;
  const safeExpression = normalizeForEvaluation(raw);
  return Function(`"use strict"; return (${safeExpression});`)();
}

function updateDisplay(preview = true) {
  expressionEl.textContent = displayExpression(expression);
  memoryLabel.textContent = `M: ${formatNumber(memory)}`;
  modeLabel.textContent = mode === "standard" ? "Standard" : "Scientific";

  if (!expression) {
    resultEl.textContent = lastResult;
    return;
  }

  if (!preview) {
    resultEl.textContent = lastResult;
    return;
  }

  try {
    resultEl.textContent = formatNumber(calculate());
  } catch {
    resultEl.textContent = lastResult;
  }
}

function appendValue(value) {
  if (lastResult !== "0" && !expression && /[+\-*/^]/.test(value)) {
    expression = lastResult.replaceAll(",", "") + value;
  } else {
    expression += value;
  }
  updateDisplay();
}

function pushHistory(exp, result) {
  history.unshift({ exp: displayExpression(exp), result });
  history = history.slice(0, 12);
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = "";

  if (!history.length) {
    const item = document.createElement("li");
    const emptyExpression = document.createElement("div");
    const emptyResult = document.createElement("div");
    emptyExpression.className = "history-expression";
    emptyResult.className = "history-result";
    emptyExpression.textContent = "No calculations yet";
    emptyResult.textContent = "Ready";
    item.append(emptyExpression, emptyResult);
    historyList.append(item);
    return;
  }

  history.forEach((entry) => {
    const item = document.createElement("li");
    const entryExpression = document.createElement("div");
    const entryResult = document.createElement("div");
    item.tabIndex = 0;
    entryExpression.className = "history-expression";
    entryResult.className = "history-result";
    entryExpression.textContent = entry.exp;
    entryResult.textContent = entry.result;
    item.append(entryExpression, entryResult);
    item.addEventListener("click", () => {
      expression = entry.result.replaceAll(",", "");
      updateDisplay(false);
    });
    historyList.append(item);
  });
}

function runEquals() {
  try {
    if (!expression.trim()) return;
    const value = calculate();
    const formatted = formatNumber(value);
    pushHistory(expression, formatted);
    expression = "";
    lastResult = formatted;
    updateDisplay(false);
  } catch (error) {
    showToast(error.message || "Cannot calculate");
  }
}

function currentValue() {
  if (expression.trim()) {
    return calculate();
  }
  return Number(lastResult.replaceAll(",", ""));
}

function applyUnary(action) {
  try {
    const value = currentValue();
    if (action === "square") {
      expression = `(${value})^2`;
    }
    if (action === "inverse") {
      expression = `1/(${value})`;
    }
    if (action === "negate") {
      expression = `-(${value})`;
    }
    if (action === "factorial") {
      if (!Number.isInteger(value) || value < 0 || value > 170) throw new Error("Factorial needs an integer from 0 to 170");
      let total = 1;
      for (let i = 2; i <= value; i += 1) total *= i;
      expression = String(total);
    }
    updateDisplay();
  } catch (error) {
    showToast(error.message || "Cannot apply function");
  }
}

function handleAction(action) {
  if (action === "clear") {
    expression = "";
    lastResult = "0";
  }
  if (action === "delete") {
    expression = expression.slice(0, -1);
  }
  if (action === "equals") {
    runEquals();
    return;
  }
  if (action === "theme") {
    document.body.classList.toggle("dark");
  }
  if (action === "copy") {
    navigator.clipboard?.writeText(resultEl.textContent);
    showToast("Result copied");
  }
  if (action === "clear-history") {
    history = [];
    renderHistory();
  }
  if (action === "memory-clear") {
    memory = 0;
  }
  if (action === "memory-recall") {
    appendValue(String(memory));
  }
  if (action === "memory-add") {
    try {
      memory += currentValue();
    } catch {
      showToast("Memory needs a valid value");
    }
  }
  if (action === "memory-subtract") {
    try {
      memory -= currentValue();
    } catch {
      showToast("Memory needs a valid value");
    }
  }
  if (["square", "inverse", "negate", "factorial"].includes(action)) {
    applyUnary(action);
    return;
  }
  updateDisplay();
}

document.querySelector(".keypad").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.value) {
    appendValue(button.dataset.value);
  }

  if (button.dataset.action) {
    handleAction(button.dataset.action);
  }
});

document.querySelector(".topbar").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button?.dataset.action) {
    handleAction(button.dataset.action);
  }
});

document.querySelector(".history-header").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button?.dataset.action) {
    handleAction(button.dataset.action);
  }
});

document.querySelector(".tabs").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  mode = button.dataset.mode;
  document.body.classList.toggle("standard", mode === "standard");
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
  updateDisplay();
});

document.addEventListener("keydown", (event) => {
  const key = event.key;
  if (/^[0-9.]$/.test(key)) appendValue(key);
  if (["+", "-", "*", "/", "%", "(", ")"].includes(key)) appendValue(key);
  if (key === "Enter" || key === "=") runEquals();
  if (key === "Backspace") handleAction("delete");
  if (key === "Escape") handleAction("clear");
});

document.body.classList.add("standard");
renderHistory();
updateDisplay(false);

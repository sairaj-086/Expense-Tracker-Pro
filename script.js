const form = document.getElementById('transaction-form');
const titleInput = document.getElementById('title');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const typeInput = document.getElementById('type');
const dateInput = document.getElementById('date');
const searchInput = document.getElementById("search");
const filterType = document.getElementById('filter-type');
const filterCat = document.getElementById('filter-category');
const filterMonth = document.getElementById('filter-month');
const listEl = document.getElementById('transaction-list');
const sortSelect = document.getElementById("sort-transactions");
const themeBtn = document.getElementById("theme-btn");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");

let categoryChart;
let monthlyChart;

// ── Theme (with persistence) ───────────────────────────────────────────────────
themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("etp_theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
});

if (localStorage.getItem("etp_theme") === "dark") {
    document.body.classList.add("dark-mode");
}

// Summary elements
const balanceEl = document.getElementById("balance");
const incomeEl  = document.getElementById("income");
const expenseEl = document.getElementById("expense");

let editId = null;
const transactions = JSON.parse(localStorage.getItem("etp_data")) || [];
dateInput.value = new Date().toISOString().split('T')[0];

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function resetFormToAddMode() {
    editId = null;
    form.reset();
    dateInput.value = new Date().toISOString().split('T')[0];
    submitBtn.textContent = 'Add Transaction';
    cancelBtn.style.display = 'none';
}

// ── Submit ────────────────────────────────────────────────────────────────────
form.addEventListener('submit', function (e) {
    e.preventDefault();

    const title    = titleInput.value.trim();
    const amount   = parseFloat(amountInput.value);
    const category = categoryInput.value;
    const type     = typeInput.value;
    const date     = dateInput.value;

    if (!title)                        { alert('Please enter a title');     return; }
    if (isNaN(amount) || amount <= 0)  { alert('Enter a valid amount');     return; }
    if (!category)                     { alert('Please select a category'); return; }
    if (!type)                         { alert('Please select a type');     return; }
    if (!date)                         { alert('Please pick a date');       return; }

    if (editId !== null) {
        const t = transactions.find(t => t.id === editId);
        if (t) {
            t.title = title;
            t.amount = amount;
            t.category = category;
            t.type = type;
            t.date = date;
        }
        resetFormToAddMode();
    } else {
        transactions.push({ id: Date.now(), title, amount, category, type, date });
        form.reset();
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    save();
    applyFiltersAndSort();
    updateSummary();
});

// ── Cancel edit ───────────────────────────────────────────────────────────────
cancelBtn.addEventListener('click', resetFormToAddMode);

// ── Save ──────────────────────────────────────────────────────────────────────
function save() {
    localStorage.setItem('etp_data', JSON.stringify(transactions));
}

// ── Render ────────────────────────────────────────────────────────────────────
function render(data = transactions) {
    if (data.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-wallet"></i>
                <p>No transactions yet</p>
            </div>
        `;
        return;
    }

    listEl.innerHTML = data.map(t => `
        <div class="transaction-item ${t.type}">
            <div class="transaction-info">
                <h4>${escapeHTML(t.title)}</h4>
                <p>${escapeHTML(t.category)} • ${escapeHTML(t.date)}</p>
            </div>
            <div class="transaction-right">
                <span>${t.type === "expense" ? "-" : "+"}₹${t.amount.toFixed(2)}</span>
                <button class="edit-btn"   data-id="${t.id}">Edit ✏️</button>
                <button class="delete-btn" data-id="${t.id}">Delete</button>
            </div>
        </div>
    `).join('');

    listEl.querySelectorAll(".delete-btn").forEach(btn =>
        btn.addEventListener("click", () => deleteTransaction(Number(btn.dataset.id)))
    );
    listEl.querySelectorAll(".edit-btn").forEach(btn =>
        btn.addEventListener("click", () => editTransaction(Number(btn.dataset.id)))
    );
}

// ── Summary ───────────────────────────────────────────────────────────────────
function updateSummary() {
    let income = 0, expense = 0;
    transactions.forEach(t => {
        if (t.type === "income") income += t.amount;
        else expense += t.amount;
    });
    balanceEl.textContent = `₹${(income - expense).toFixed(2)}`;
    incomeEl.textContent  = `₹${income.toFixed(2)}`;
    expenseEl.textContent = `₹${expense.toFixed(2)}`;
}

// ── Delete ────────────────────────────────────────────────────────────────────
function deleteTransaction(id) {
    if (!confirm('Delete this transaction?')) return;

    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
        transactions.splice(index, 1);

        // If the deleted transaction was mid-edit, reset the form
        if (editId === id) {
            resetFormToAddMode();
        }

        save();
        applyFiltersAndSort();
        updateSummary();
    }
}

// ── Edit ──────────────────────────────────────────────────────────────────────
function editTransaction(id) {
    editId = id;
    const t = transactions.find(t => t.id === id);
    if (!t) return;

    titleInput.value    = t.title;
    amountInput.value   = t.amount;
    categoryInput.value = t.category;
    typeInput.value     = t.type;
    dateInput.value     = t.date;

    submitBtn.textContent = 'Update Transaction';
    cancelBtn.style.display = 'inline-block';
    titleInput.focus();
}

// ── Combined Filter + Sort ─────────────────────────────────────────────────────
function applyFiltersAndSort() {
    const searchTerm       = searchInput.value.toLowerCase();
    const selectedType     = filterType.value;
    const selectedCategory = filterCat.value;
    const selectedMonth    = filterMonth.value;
    const sortValue        = sortSelect.value;

    let result = transactions.filter(t => {
        const matchesSearch    = t.title.toLowerCase().includes(searchTerm);
        const matchesType      = selectedType     === "all" || t.type     === selectedType;
        const matchesCategory  = selectedCategory === "all" || t.category === selectedCategory;
        const matchesMonth     = selectedMonth    === ""    || t.date.startsWith(selectedMonth);
        return matchesSearch && matchesType && matchesCategory && matchesMonth;
    });

    if      (sortValue === "highest") result.sort((a, b) => b.amount - a.amount);
    else if (sortValue === "lowest")  result.sort((a, b) => a.amount - b.amount);
    else if (sortValue === "latest")  result.sort((a, b) => new Date(b.date) - new Date(a.date));
    else if (sortValue === "oldest")  result.sort((a, b) => new Date(a.date) - new Date(b.date));

    render(result);
    updateSummary();
    updateCategoryBreakdown();
    updateMonthlyChart();
}

function updateCategoryBreakdown() {
    let categoryTotals = {};

    transactions.forEach(transaction => {
       if (transaction.type === "expense") {
          const category = transaction.category;

          if (!categoryTotals[category]) {
            categoryTotals[category] = 0;
          }

          categoryTotals[category] += transaction.amount;
       }
    });

    updateCategoryChart(categoryTotals);
}

function updateCategoryChart(categoryTotals) {
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    const ctx = document.getElementById("categoryChart");

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [{
                data: data
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
        }
    });
}

function updateMonthlyChart() {
    const monthlyTotals = {};
    transactions.forEach(transaction => {
        const month = transaction.date.slice(0, 7);

        if (!monthlyTotals[month]) {
            monthlyTotals[month] = {
                income: 0,
                expense: 0
            };
        }

        if (transaction.type === "income") {
            monthlyTotals[month].income += transaction.amount;
        } else {
            monthlyTotals[month].expense += transaction.amount;
        }
    });

    const labels = Object.keys(monthlyTotals).sort();
    const incomeData = labels.map(month => monthlyTotals[month].income);
    const expenseData = labels.map(month => monthlyTotals[month].expense);

    const ctx = document.getElementById("monthlyChart");

    if (monthlyChart) {
        monthlyChart.destroy();
    }

    monthlyChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Income",
                    data: incomeData,
                    backgroundColor: "#4CAF50"
                },
                {
                    label: "Expense",
                    data: expenseData,
                    backgroundColor: "#F44336"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// ── Listeners ─────────────────────────────────────────────────────────────────
searchInput.addEventListener("input",  applyFiltersAndSort);
filterType.addEventListener("change",  applyFiltersAndSort);
filterCat.addEventListener("change",   applyFiltersAndSort);
filterMonth.addEventListener("change", applyFiltersAndSort);
sortSelect.addEventListener("change",  applyFiltersAndSort);

// ── Init ──────────────────────────────────────────────────────────────────────
applyFiltersAndSort();

let transactions = [];
let editIndex = null;
let currentCurrency = "USD";
let monthlyCap = 0;

const form = document.querySelector("form");
const tbody = document.querySelector("#transaction-rows");
const searchInput = document.querySelector("#search");
const currencySelect = document.querySelector("#currency-select");
const monthlyCapInput = document.querySelector("#monthly-cap");
const ariaAnnouncer = document.querySelector("#aria-announcer");

const descRegex = /^\S(.*\S)?$/;
const amountRegex = /^(0|[1-9]\d*)(\.\d{1,2})?$/;
const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const duplicateRegex = /\b(\w+)\s+\1\b/i;

function init() {
    const savedTransactions = localStorage.getItem("transactions");
    if (savedTransactions) transactions = JSON.parse(savedTransactions);

    const savedCurrency = localStorage.getItem("currency");
    if (savedCurrency) {
        currentCurrency = savedCurrency;
        if (currencySelect) currencySelect.value = currentCurrency;
    }

    const savedCap = localStorage.getItem("monthlyCap");
    if (savedCap) {
        monthlyCap = Number(savedCap);
        if (monthlyCapInput) monthlyCapInput.value = monthlyCap;
    }

    renderTable(transactions);
}

function renderTable(dataToRender) {
    tbody.innerHTML = "";

    dataToRender.forEach((item, index) => {
        tbody.innerHTML += `
            <tr class="fade-in-row">
                <td>${item.description}</td>
                <td>${formatCurrencyValue(item.amount)}</td>
                <td>
                    <button class="edit-btn" data-index="${index}">Edit</button>
                    <button class="delete-btn" data-index="${index}">Delete</button>
                </td>
            </tr>
        `;
    });

    calculateDashboardMetrics();
}

function formatCurrencyValue(amount) {
    const num = Number(amount).toFixed(2);
    if (currentCurrency === "EUR") return `€${num}`;
    if (currentCurrency === "RWF") return `${num} RWF`;
    return `$${num}`;
}

function calculateDashboardMetrics() {
    document.querySelector("#total-card").innerText = transactions.length;

    const totalSpent = transactions.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalSpentCard = document.querySelector("#total-spent-card");
    if (totalSpentCard) totalSpentCard.innerText = formatCurrencyValue(totalSpent);

    const categoryCounts = {};
    let topCategory = "None";
    let maxCount = 0;

    transactions.forEach(item => {
        if (item.category) {
            categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
            if (categoryCounts[item.category] > maxCount) {
                maxCount = categoryCounts[item.category];
                topCategory = item.category;
            }
        }
    });
    
    const topCategoryCard = document.querySelector("#top-category-card");
    if (topCategoryCard) topCategoryCard.innerText = topCategory;

    const remainingBudget = monthlyCap - totalSpent;
    const remainingCard = document.querySelector("#remaining-budget-card");
    if (remainingCard) {
        remainingCard.innerText = formatCurrencyValue(remainingBudget);
        remainingCard.style.color = remainingBudget < 0 ? "red" : "green";
    }
}

function announceToScreenReader(message) {
    if (ariaAnnouncer) {
        ariaAnnouncer.innerText = message;
    }
}

form.addEventListener("submit", function(event) {
    event.preventDefault();

    const description = document.querySelector("#description").value.trim();
    const amount = document.querySelector("#amount").value;
    const category = document.querySelector("#category").value;
    const date = document.querySelector("#date").value;

    if (!descRegex.test(description)) return alert("Invalid Description text formatting.");
    if (!amountRegex.test(amount)) return alert("Invalid Currency Amount input.");
    if (!dateRegex.test(date)) return alert("Invalid Calendar Date.");
    
    if (duplicateRegex.test(description)) {
         alert("Typo Warning: Duplicate continuous words found!");
    }

    const currentTransaction = { description, amount, category, date };

    if (editIndex !== null) {
        transactions[editIndex] = currentTransaction;
        editIndex = null;
        form.querySelector("button[type='submit']").innerText = "Add";
        announceToScreenReader("Transaction updated successfully.");
    } else {
        transactions.push(currentTransaction);
        announceToScreenReader("New transaction added successfully.");
    }

    localStorage.setItem("transactions", JSON.stringify(transactions));
    renderTable(transactions);
    form.reset();
});

tbody.addEventListener("click", function(event) {
    const index = Number(event.target.getAttribute("data-index"));

    if (event.target.classList.contains("delete-btn")) {
        transactions.splice(index, 1);
        localStorage.setItem("transactions", JSON.stringify(transactions));
        renderTable(transactions);
        announceToScreenReader("Transaction record erased.");
    }

    if (event.target.classList.contains("edit-btn")) {
        editIndex = index;
        const targetItem = transactions[editIndex];

        document.querySelector("#description").value = targetItem.description;
        document.querySelector("#amount").value = targetItem.amount;
        document.querySelector("#category").value = targetItem.category;
        document.querySelector("#date").value = targetItem.date;

        form.querySelector("button[type='submit']").innerText = "Update Transaction";
        announceToScreenReader("Form loaded with transaction data. Ready for changes.");
    }
});

if (searchInput) {
    searchInput.addEventListener("input", function() {
        try {
            const query = new RegExp(searchInput.value, "i");
            const filtered = transactions.filter(t => query.test(t.description));
            renderTable(filtered);
        } catch (error) {
            console.log("Waiting for user to stop typing valid syntax regex criteria...");
        }
    });
}

if (currencySelect) {
    currencySelect.addEventListener("change", function() {
        currentCurrency = currencySelect.value;
        localStorage.setItem("currency", currentCurrency);
        renderTable(transactions);
    });
}

if (monthlyCapInput) {
    monthlyCapInput.addEventListener("input", function() {
        monthlyCap = Number(monthlyCapInput.value) || 0;
        localStorage.setItem("monthlyCap", monthlyCap);
        calculateDashboardMetrics();
    });
}

function exportToJSONFile() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "finance_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

const jsonFileInput = document.querySelector("#import-json-input");
if (jsonFileInput) {
    jsonFileInput.addEventListener("change", function(event) {
        const fileReader = new FileReader();
        fileReader.onload = function(e) {
            try {
                const parsedData = JSON.parse(e.target.result);
                if (Array.isArray(parsedData)) {
                    transactions = parsedData;
                    localStorage.setItem("transactions", JSON.stringify(transactions));
                    renderTable(transactions);
                    alert("Database imported clean!");
                } else {
                    alert("Invalid structure file schema context.");
                }
            } catch (err) {
                alert("Corrupted data error parsed reading backup file.");
            }
        };
        fileReader.readAsText(event.target.files[0]);
    });
}

window.onload = init;
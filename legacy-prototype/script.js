let books = JSON.parse(localStorage.getItem("lib_books")) || [];
let history = JSON.parse(localStorage.getItem("lib_history")) || [];
let staffList = JSON.parse(localStorage.getItem("lib_staff")) || ["Librarian"];
let sectionList = JSON.parse(localStorage.getItem("lib_sections")) || ["Faculty"];

function save() {
  localStorage.setItem("lib_books", JSON.stringify(books));
  localStorage.setItem("lib_history", JSON.stringify(history));
  localStorage.setItem("lib_staff", JSON.stringify(staffList));
  localStorage.setItem("lib_sections", JSON.stringify(sectionList));
}

function calculateDays(dateStr) {
  const borrowedDate = new Date(dateStr);
  const today = new Date();
  const diffTime = Math.abs(today - borrowedDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 0 ? "Today" : `${diffDays} Day(s)`;
}

function updateWidgets() {
  const borrowers = {};
  const bookCounts = {};

  history.forEach(h => {
    borrowers[h.borrower] = (borrowers[h.borrower] || 0) + 1;
    bookCounts[h.title] = (bookCounts[h.title] || 0) + h.qty;
  });

  const topB = Object.entries(borrowers).sort((a,b) => b[1] - a[1]).slice(0, 5);
  const topBooks = Object.entries(bookCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);

  document.getElementById("topBorrowersList").innerHTML = topB.map(b => `<li>${b[0]} <span>${b[1]} times</span></li>`).join("") || "No data";
  document.getElementById("topBooksList").innerHTML = topBooks.map(b => `<li>${b[0]} <span>${b[1]} copies</span></li>`).join("") || "No data";
}

function render() {
  updateDropdowns();
  updateWidgets();
  const invBody = document.getElementById("inventoryBody");
  const loanBody = document.getElementById("loanBody");
  const search = (document.getElementById("searchInput").value || "").toLowerCase();
  const loanSearch = (document.getElementById("loanSearchInput").value || "").toLowerCase();

  invBody.innerHTML = "";
  loanBody.innerHTML = "";

  books.forEach(b => {
    if (b.title.toLowerCase().includes(search) || b.author.toLowerCase().includes(search)) {
      const outQty = history.reduce((sum, h) => {
        return sum + (h.title === b.title ? (h.qty - h.returnedQty) : 0);
      }, 0);
      const avail = b.copies - outQty;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${b.title}</td><td>${b.author}</td><td>${b.copies}</td>
        <td style="color:${avail > 0 ? 'green' : 'red'}; font-weight:bold;">${avail}</td>
        <td>
          <button class="primary" onclick="openBorrowModal('${b.id}', ${avail})" ${avail <= 0 ? 'disabled' : ''}>Borrow</button>
          <button class="edit-btn" onclick="openBookModal('${b.id}')">Edit</button>
          <button class="delete-btn" onclick="deleteBook('${b.id}')">🗑️</button>
        </td>`;
      invBody.appendChild(tr);
    }
  });

  history.forEach((h, i) => {
    const remaining = h.qty - h.returnedQty;
    if (remaining > 0 && (h.borrower.toLowerCase().includes(loanSearch) || h.title.toLowerCase().includes(loanSearch))) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${h.title}</td>
        <td><span class="qty-badge">${remaining} / ${h.qty}</span></td>
        <td>${h.borrower}</td>
        <td>${calculateDays(h.borrowedAt)}</td>
        <td>${h.inCharge}</td>
        <td>${h.borrowedAt}</td>
        <td><button class="primary" onclick="openReturnModal(${i})">Return</button></td>`;
      loanBody.appendChild(tr);
    }
  });
  save();
}

function openReturnModal(i) {
  const h = history[i];
  const remaining = h.qty - h.returnedQty;
  document.getElementById("returnHistoryIndex").value = i;
  document.getElementById("returnInfoText").innerHTML = `
    <strong>Borrower:</strong> ${h.borrower}<br>
    <strong>Book:</strong> ${h.title}<br>
    <strong>Remaining:</strong> ${remaining}`;
  
  const returnInput = document.getElementById("returnQty");
  returnInput.max = remaining;
  returnInput.value = remaining;
  document.getElementById("returnModal").style.display = "block";
}

function confirmReturn() {
  const i = document.getElementById("returnHistoryIndex").value;
  const q = parseInt(document.getElementById("returnQty").value);
  const staff = document.getElementById("returnInChargeSelect").value;
  const h = history[i];
  const remaining = h.qty - h.returnedQty;

  if (isNaN(q) || q <= 0 || q > remaining) return alert("Invalid quantity.");

  if(!h.returnTransactions) h.returnTransactions = [];
  h.returnTransactions.push({
    qty: q,
    date: new Date().toLocaleString(),
    staff: staff
  });

  h.returnedQty += q;
  
  if (h.returnedQty === h.qty) {
    h.returnedAt = new Date().toLocaleString();
    h.returnedByStaff = staff;
  }

  closeModal('returnModal');
  render();
}

function saveBook() {
  const id = document.getElementById("editBookId").value;
  const title = document.getElementById("bookTitle").value.trim();
  const author = document.getElementById("bookAuthor").value.trim();
  const copies = parseInt(document.getElementById("bookCopies").value);
  
  if (!title || !author || isNaN(copies)) return alert("Fill all fields.");

  const duplicate = books.find(b => b.title.toLowerCase() === title.toLowerCase() && b.id !== id);
  if (duplicate) return alert("A book with this title already exists in the inventory!");

  if (id) {
    const b = books.find(x => x.id === id);
    b.title = title; b.author = author; b.copies = copies;
  } else {
    books.push({ id: Date.now().toString(), title, author, copies });
  }
  closeModal('bookModal'); render();
}

function openBookModal(id = null) {
  const b = books.find(x => x.id === id);
  document.getElementById("modalTitle").innerText = b ? "Edit Book" : "Add New Book";
  document.getElementById("editBookId").value = id || "";
  document.getElementById("bookTitle").value = b ? b.title : "";
  document.getElementById("bookAuthor").value = b ? b.author : "";
  document.getElementById("bookCopies").value = b ? b.copies : 1;
  document.getElementById("bookModal").style.display = "block";
}

function openBorrowModal(id, max) {
  document.getElementById("borrowBookId").value = id;
  document.getElementById("borrowQty").max = max;
  document.getElementById("borrowQty").value = 1;
  document.getElementById("borrowerName").value = "";
  document.getElementById("borrowModal").style.display = "block";
}

function confirmBorrow() {
  const b = books.find(x => x.id === document.getElementById("borrowBookId").value);
  const qty = parseInt(document.getElementById("borrowQty").value);
  const name = document.getElementById("borrowerName").value.trim();
  if (!name || isNaN(qty) || qty <= 0) return alert("Invalid data.");
  
  history.push({
    title: b.title, borrower: name, qty: qty, returnedQty: 0,
    inCharge: document.getElementById("inChargeSelect").value,
    gs: document.getElementById("gradeSectionSelect").value,
    borrowedAt: new Date().toLocaleString(), returnedAt: "",
    returnTransactions: [] 
  });
  closeModal('borrowModal'); render();
}

function openSettingsModal() { document.getElementById("settingsModal").style.display = "block"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }

/* ==========================================================================
   PASSWORD PROTECTED RESET FUNCTIONS ("riel")
   ========================================================================== */
function resetBorrowingLogs() {
  const pw = prompt("Enter password to reset borrowing logs:");
  if (pw === "riel") {
    if (confirm("Reset ALL borrowing records?")) {
      history = []; save(); render();
    }
  } else if (pw !== null) {
    alert("Incorrect password.");
  }
}

function resetLibrary() {
  const pw = prompt("Enter password to wipe the entire database:");
  if (pw === "riel") {
    if (confirm("Wipe everything? This is permanent.")) {
      localStorage.clear(); location.reload();
    }
  } else if (pw !== null) {
    alert("Incorrect password.");
  }
}

function updateDropdowns() {
  const options = staffList.map(s => `<option>${s}</option>`).join("");
  document.getElementById("inChargeSelect").innerHTML = options;
  document.getElementById("returnInChargeSelect").innerHTML = options;
  document.getElementById("gradeSectionSelect").innerHTML = sectionList.map(s => `<option>${s}</option>`).join("");
  document.getElementById("staffListView").innerHTML = staffList.map((s,i) => `<li>${s}<span class="delete-item" onclick="removeListItem('staff',${i})">✖</span></li>`).join("");
  document.getElementById("sectionListView").innerHTML = sectionList.map((s,i) => `<li>${s}<span class="delete-item" onclick="removeListItem('section',${i})">✖</span></li>`).join("");
}

function addListItem(type) {
  const input = document.getElementById(type === 'staff' ? "newStaffName" : "newSectionName");
  if (!input.value.trim()) return;
  type === 'staff' ? staffList.push(input.value.trim()) : sectionList.push(input.value.trim());
  input.value = ""; render();
}

function removeListItem(type, i) {
  type === 'staff' ? staffList.splice(i, 1) : sectionList.splice(i, 1);
  render();
}

function deleteBook(id) {
  if (confirm("Delete this book?")) {
    books = books.filter(x => x.id !== id);
    render();
  }
}

render();
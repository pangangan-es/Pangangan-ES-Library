let isManageMode = false;

function toggleDeleteMode() {
    const pw = prompt("Enter password to manage records:");
    
    if (pw === "riel") {
        isManageMode = !isManageMode;
        const btn = document.getElementById("toggleDeleteBtn");
        const container = document.getElementById("historyTable");
        
        if (isManageMode) {
            btn.innerText = "✅ Done Managing";
            btn.style.background = "#059669";
            container.classList.add("manage-mode");
        } else {
            btn.innerText = "🛠️ Manage Records";
            btn.style.background = "#64748b";
            container.classList.remove("manage-mode");
        }
    } else if (pw !== null) {
        alert("Incorrect password.");
    }
}

function renderSummary() {
  const hist = JSON.parse(localStorage.getItem("lib_history")) || [];
  const staff = JSON.parse(localStorage.getItem("lib_staff")) || [];
  const tbody = document.getElementById("summaryBody");
  tbody.innerHTML = "";
  
  const sFilter = document.getElementById("filterStaff");
  if (sFilter.options.length === 1) {
    staff.forEach(s => {
        let opt = document.createElement("option");
        opt.value = s; opt.innerText = s;
        sFilter.appendChild(opt);
    });
  }

  const bFilter = document.getElementById("filterBorrower");
  if (bFilter.options.length === 1) {
      const uniqueBorrowers = [...new Set(hist.map(h => h.borrower))].sort();
      uniqueBorrowers.forEach(b => {
          let opt = document.createElement("option");
          opt.value = b; opt.innerText = b;
          bFilter.appendChild(opt);
      });
  }

  const searchTerm = (document.getElementById("mainSearch").value || "").toLowerCase();
  const fStaff = sFilter.value;
  const fBorrower = bFilter.value;
  const bStart = document.getElementById("dateB_start").value;
  const bEnd = document.getElementById("dateB_end").value;
  const rStart = document.getElementById("dateR_start").value;
  const rEnd = document.getElementById("dateR_end").value;

  const displayHistory = [...hist].reverse();

  displayHistory.forEach((h, reverseIdx) => {
    const originalIdx = hist.length - 1 - reverseIdx;

    const matchesSearch = h.title.toLowerCase().includes(searchTerm) || h.borrower.toLowerCase().includes(searchTerm);
    const matchesStaff = !fStaff || h.inCharge === fStaff;
    const matchesBorrower = !fBorrower || h.borrower === fBorrower;
    
    const borrowDate = new Date(h.borrowedAt);
    const matchesBDate = (!bStart || borrowDate >= new Date(bStart)) && (!bEnd || borrowDate <= new Date(bEnd));
    
    let matchesRDate = true;
    if (rStart || rEnd) {
        if (!h.returnTransactions || h.returnTransactions.length === 0) {
            matchesRDate = false;
        } else {
            const lastReturn = new Date(h.returnTransactions[h.returnTransactions.length - 1].date);
            matchesRDate = (!rStart || lastReturn >= new Date(rStart)) && (!rEnd || lastReturn <= new Date(rEnd));
        }
    }

    if (matchesSearch && matchesStaff && matchesBorrower && matchesBDate && matchesRDate) {
      const isDone = h.returnedQty === h.qty;

      let logsHtml = `<ul class="transaction-list">`;
      if(h.returnTransactions && h.returnTransactions.length > 0) {
          h.returnTransactions.forEach(t => {
              logsHtml += `
                <li class="transaction-item">
                  <strong>Returned ${t.qty} copy/ies</strong><br>
                  <span>On: ${t.date}</span><br>
                  <small>Received by: ${t.staff}</small>
                </li>`;
          });
      } else {
          logsHtml += `<li style="color:#94a3b8; font-style: italic; font-size: 0.85rem;">No returns recorded</li>`;
      }
      logsHtml += `</ul>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="col-book-details"><strong>${h.title}</strong><br><small style="color:#64748b">Total Qty: ${h.qty}</small></td>
        <td class="col-borrower"><strong>${h.borrower}</strong><br><small style="color:#64748b">${h.gs}</small></td>
        <td>
          <small><strong>Date Out:</strong> ${h.borrowedAt}</small><br>
          <small><strong>Issued By:</strong> ${h.inCharge}</small>
        </td>
        <td>${logsHtml}</td>
        <td>
          <div style="color:${isDone?'#059669':'#dc2626'}; font-weight:bold; font-size:12px;">
            ${isDone ? '✅ RETURNED' : `⏳ PENDING (${h.qty - h.returnedQty} left)`}
          </div>
          <button class="delete-btn history-delete-btn" onclick="deleteHistoryEntry(${originalIdx})">🗑️ Delete</button>
        </td>`;
      tbody.appendChild(tr);
    }
  });
}

function deleteHistoryEntry(index) {
  if (confirm("Delete this specific history record?")) {
    let hist = JSON.parse(localStorage.getItem("lib_history")) || [];
    hist.splice(index, 1);
    localStorage.setItem("lib_history", JSON.stringify(hist));
    renderSummary();
  }
}

function clearFilters() {
    document.querySelectorAll('.filter-bar input, .filter-bar select').forEach(el => el.value = "");
    renderSummary();
}

function exportCSV() {
  const hist = JSON.parse(localStorage.getItem("lib_history")) || [];
  let csv = "Book,Total Qty,Returned Qty,Borrower,Section,InCharge,Borrowed At,Status\n";
  hist.forEach(h => { 
      const status = h.returnedQty === h.qty ? "Completed" : "Pending";
      csv += `"${h.title}",${h.qty},${h.returnedQty},"${h.borrower}","${h.gs}","${h.inCharge}","${h.borrowedAt}",${status}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', 'Library_History.csv');
  a.click();
}

document.addEventListener("DOMContentLoaded", renderSummary);
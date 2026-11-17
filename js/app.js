document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#item-form");
    const portfolioSelect = document.querySelector("#portfolio-select");
    const itemsContainer = document.querySelector("#items-container");
    const newPortfolioInput = document.querySelector("#new-portfolio-name");
    const addPortfolioBtn = document.querySelector("#add-portfolio-btn");
    const deletePortfolioBtn = document.querySelector("#delete-portfolio-btn");
    const importJsonInput = document.querySelector("#import-item-json");
    const importItemBtn = document.querySelector("#import-item-btn");


// โหลดรายชื่อมาใส่ใน <select>
loadPortfolioOptions();
renderItems();

// ปุ่มเพิ่ม Portfolio
addPortfolioBtn.addEventListener("click", () => {
    const name = newPortfolioInput.value.trim();
    if (!name) {
        alert("กรุณากรอกชื่อ Profile");
    return;
    }

    const portfolioId = "portfolio_" + Date.now();
    let allPortfolios = JSON.parse(localStorage.getItem("portfoliosData")) || {};

    allPortfolios[portfolioId] = { name: name, items: [] };
    localStorage.setItem("portfoliosData", JSON.stringify(allPortfolios));

    newPortfolioInput.value = "";
    loadPortfolioOptions();
    portfolioSelect.value = portfolioId;
    renderItems();
});

// ปุ่มลบ Portfolio ปัจจุบัน
deletePortfolioBtn.addEventListener("click", () => {
    const selectedPortfolio = portfolioSelect.value;
    const allPortfolios = JSON.parse(localStorage.getItem("portfoliosData")) || {};
    const portfolioName = allPortfolios[selectedPortfolio]?.name || selectedPortfolio;

    // เช็ก Portfolio เพื่อป้องกันไม่ให้ลบหมด
    if (Object.keys(allPortfolios).length <= 1) {
        alert("ไม่สามารถลบได้ ต้องมีอย่างน้อย 1 Profile ในระบบ");
    return;
    }

    if (confirm(`ต้องการลบ "${portfolioName}" พร้อมข้อมูลด้านในทั้งหมดใช่หรือไม่?`)) {
        delete allPortfolios[selectedPortfolio];
        localStorage.setItem("portfoliosData", JSON.stringify(allPortfolios));

        loadPortfolioOptions();
        renderItems();
    }
});

// เลือก Portfolio เข้า <select>
function loadPortfolioOptions() {
    let allPortfolios = JSON.parse(localStorage.getItem("portfoliosData")) || {};

    // ตั้งค่าเริ่มต้นถ้ายังไม่มีข้อมูลใน localStorage
    if (Object.keys(allPortfolios).length === 0) {
        allPortfolios = {
            "Profile_1": { name: "Profile 1", items: [] },
            "Profile_2": { name: "Profile 2", items: [] }
        };
        localStorage.setItem("portfoliosData", JSON.stringify(allPortfolios));
    }

    // จำค่าที่เลือกไว้ปัจจุบัน
    const currentSelected = portfolioSelect.value;

    // ล้าง HTML เก่า
    portfolioSelect.innerHTML = "";

    // สร้าง <option> ใหม่
    Object.keys(allPortfolios).forEach(id => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = allPortfolios[id].name || id;
        portfolioSelect.appendChild(option);
    });

    // ป้องกัน value เป็นค่าว่าง
    if (currentSelected && allPortfolios[currentSelected]) {
        portfolioSelect.value = currentSelected;
    } else {
        portfolioSelect.selectedIndex = 0;
    }
}

// สลับการแสดงผลเมื่อเปลี่ยนตัวเลือก Portfolio
portfolioSelect.addEventListener("change", renderItems);

// บันทึก Item ใหม่
form.addEventListener("submit", (event) => {
    event.preventDefault();

    const selectedPortfolio = portfolioSelect.value;
    
    // เช็กป้องกันถ้าไม่ได้เลือก Profile
    if (!selectedPortfolio) {
        alert("กรุณาเลือก Profile ก่อนบันทึก");
        return;
    }

    const newItem = {
        id: document.querySelector("#item-id").value.trim() || "item_" + Date.now(),
        title: document.querySelector("#item-title").value.trim(),
        type: document.querySelector("#item-type").value.trim(),
        date: document.querySelector("#item-date").value,
        role: document.querySelector("#item-role").value.trim(),
        description: document.querySelector("#item-description").value.trim(),
        skills: document.querySelector("#item-skills").value.split(",").map(s => s.trim()).filter(Boolean),
        reflection: {
            whatIDid: document.querySelector("#item-what-did").value.trim(),
            whatILearned: document.querySelector("#item-what-learned").value.trim(),
            challenge: document.querySelector("#item-challenge").value.trim(),
            nextStep: document.querySelector("#item-next-step").value.trim()
        },
        evidence: [document.querySelector("#item-evidence").value.trim()]
    };

    let allPortfolios = JSON.parse(localStorage.getItem("portfoliosData")) || {};
    
    if (!allPortfolios[selectedPortfolio]) {
        allPortfolios[selectedPortfolio] = { 
            name: portfolioSelect.options[portfolioSelect.selectedIndex]?.text || selectedPortfolio, 
            items: [] 
        };
    }

    allPortfolios[selectedPortfolio].items.push(newItem);
    localStorage.setItem("portfoliosData", JSON.stringify(allPortfolios));

    form.reset();
    alert("Saved!");
    renderItems();
});

// Import From textarea
importItemBtn.addEventListener("click", () => {
    const rawJson = importJsonInput.value.trim();
    if (!rawJson) {
        alert("This is empty bro... How am I gonna Import nothing.");
        return;
    }

    let ImportData;
    try {
        ImportData = JSON.parse(rawJson);
    } catch (error) {
        alert("Wrong format or smt recheck pls");
        return;
    }

    // ครบบ่?
    if (!ImportData.title || !ImportData.type || !ImportData.date || !ImportData.role || !ImportData.description) {
        alert("ข้อมูล Item ไม่ครบ");
        return;
    }

    // จัดให้ตรง Format
    const importedItem = {
        id: String(ImportData.id || "item_" + Date.now()).trim(),
        title: String(ImportData.title).trim(),
        type: String(ImportData.type).trim(),
        date: String(ImportData.date).trim(),
        role: String(ImportData.role).trim(),
        description: String(ImportData.description).trim(),
        skills: Array.isArray(ImportData.skills)
            ? ImportData.skills.map(s => String(s).trim()).filter(Boolean)
            : typeof ImportData.skills === "string"
                ? ImportData.skills.split(",").map(s => s.trim()).filter(Boolean)
                : [],
        reflection: {
            whatIDid: String(ImportData.reflection?.whatIDid || "-").trim(),
            whatILearned: String(ImportData.reflection?.whatILearned || "-").trim(),
            challenge: String(ImportData.reflection?.challenge || "-").trim(),
            nextStep: String(ImportData.reflection?.nextStep || "-").trim()
        },
        evidence: Array.isArray(ImportData.evidence) && ImportData.evidence.length > 0
            ? ImportData.evidence.map(e => String(e).trim()).filter(Boolean)
            : ImportData.evidence
                ? [String(ImportData.evidence).trim()]
                : ["#"]
    };

    const selectedPortfolio = portfolioSelect.value;
    let allPortfolios = JSON.parse(localStorage.getItem("portfoliosData")) || {};
    if (!allPortfolios[selectedPortfolio]) {
        allPortfolios[selectedPortfolio] = {
            name: portfolioSelect.options[portfolioSelect.selectedIndex]?.text || selectedPortfolio,
            items: []
        };
    }

    allPortfolios[selectedPortfolio].items.push(importedItem);
    localStorage.setItem("portfoliosData", JSON.stringify(allPortfolios));

    importJsonInput.value = "";
    alert(`Import "${importedItem.title}" สำเร็จ!`);
    renderItems();
});

// If Download .json
function downloadJSON(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


// สร้างการ์ดแจ้งเตือนเล็กๆ ลอยขึ้นบนปุ่มที่กด
function showButtonNotif(btnElement, message, isError = false) {
    if (btnElement._notifEl) {
        btnElement._notifEl.remove();
    }

    const notif = document.createElement("div");
    notif.className = "btn-notif-card";
    if (isError) notif.classList.add("is-error");
    notif.innerHTML = `<i class="bi ${isError ? "bi-exclamation-circle" : "bi-check-circle-fill"}"></i> ${escapeHTML(message)}`;

    document.body.appendChild(notif);
    btnElement._notifEl = notif;

    // Middle align card
    const rect = btnElement.getBoundingClientRect();
    const notifRect = notif.getBoundingClientRect();
    const top = rect.top + window.scrollY - notifRect.height - 8;
    let left = rect.left + window.scrollX + (rect.width / 2) - (notifRect.width / 2);

    // No card bleeding
    const maxLeft = window.scrollX + window.innerWidth - notifRect.width - 8;
    left = Math.min(Math.max(8, left), maxLeft);

    notif.style.top = `${Math.max(8, top)}px`;
    notif.style.left = `${left}px`;

    requestAnimationFrame(() => {
        notif.classList.add("show");
    });

    // Fade out
    setTimeout(() => {
        notif.classList.remove("show");
        setTimeout(() => {
            notif.remove();
            if (btnElement._notifEl === notif) {
                btnElement._notifEl = null;
            }
        }, 250);
    }, 1800);
}

// Copy JSON Clipboard
function copyJSONToClipboard(data, btnElement, successMessage) {
    const jsonString = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(jsonString)
        .then(() => {
            showButtonNotif(btnElement, successMessage);
        })
        .catch(() => {
            showButtonNotif(btnElement, "Error : Check clipboard permission", true);
        });
}

// Copy Export Delete
function renderItems() {
    const selectedPortfolio = portfolioSelect.value;
    const allPortfolios = JSON.parse(localStorage.getItem("portfoliosData")) || {};
    const items = allPortfolios[selectedPortfolio]?.items || [];

    itemsContainer.innerHTML = items.length === 0 ? "<p>ยังไม่มีรายการ Portfolio Item</p>" : "";

    items.forEach((item, index) => {
        const itemDiv = document.createElement("div");
        itemDiv.style.border = "1px solid #ccc";
        itemDiv.style.padding = "10px";
        itemDiv.style.marginBottom = "10px";
        itemDiv.style.opacity = "1";
        itemDiv.style.transition = "opacity 0.8s ease";

        itemDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <h3 style="margin: 0;">[${escapeHTML(item.id)}] ${escapeHTML(item.title)} <a style="font-size: small">(${escapeHTML(item.type)})</a></h3>
                <div style="display: flex; gap: 6px;">
                    <button type="button" class="copy-item-btn btn btn-outline-secondary btn-sm" data-index="${index}">Copy JSON</button>
                    <button type="button" class="export-item-btn btn btn-outline-dark btn-sm" data-index="${index}">Export .json</button>
                    <button type="button" class="delete-item-btn" data-index="${index}" style="color: red;">ลบ</button>
                </div>
            </div>
            <p><strong>Date:</strong> ${escapeHTML(item.date)} | <strong>Role:</strong> ${escapeHTML(item.role)}</p>
            <p><strong>Description:</strong> ${escapeHTML(item.description)}</p>
            <p><strong>Skills:</strong> ${item.skills.map(escapeHTML).join(", ")}</p>
            <details>
            <summary><strong>Reflection</strong></summary>
            <ul>
            <li><strong>What I Did:</strong> ${escapeHTML(item.reflection.whatIDid)}</li>
            <li><strong>Learned:</strong> ${escapeHTML(item.reflection.whatILearned)}</li>
            <li><strong>Challenge:</strong> ${escapeHTML(item.reflection.challenge)}</li>
            <li><strong>Next:</strong> ${escapeHTML(item.reflection.nextStep)}</li>
            </ul>
            </details>
            <p><strong>Evidence:</strong> <a href="${escapeHTML(item.evidence[0])}" target="_blank">${escapeHTML(item.evidence[0])}</a></p>
        `;
        
        const deleteBtn = itemDiv.querySelector(".delete-item-btn");
        deleteBtn.addEventListener("click", () => {
            deleteItem(item, itemDiv);
        });

        itemsContainer.appendChild(itemDiv);
    });

    // Copy .json เฉพาะ Item
    document.querySelectorAll(".copy-item-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const clickedBtn = e.currentTarget;
            const itemIndex = clickedBtn.getAttribute("data-index");
            const itemData = items[itemIndex];
            if (itemData) {
                copyJSONToClipboard(itemData, clickedBtn, "Copied JSON!");
            }
        });
    });

    // Export .json เฉพาะ Item
    document.querySelectorAll(".export-item-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const clickedBtn = e.currentTarget;
            const itemIndex = clickedBtn.getAttribute("data-index");
            const itemData = items[itemIndex];
            if (itemData) {
                const safeFilename = `${itemData.id || "portfolio-item"}.json`;
                downloadJSON(itemData, safeFilename);
                showButtonNotif(clickedBtn, `Exported ${safeFilename}`);
            }
        });
    });

}

    // ฟังก์ชันลบเฉพาะ Item
    function deleteItem(targetItem, itemDiv) {
        const selectedPortfolio = portfolioSelect.value;
        let allPortfolios = JSON.parse(localStorage.getItem("portfoliosData")) || {};

        if (allPortfolios[selectedPortfolio]) {
            const currentItems = allPortfolios[selectedPortfolio].items;
            const actualIndex = currentItems.findIndex(
                i => i.id === targetItem.id && i.title === targetItem.title && i.date === targetItem.date
            );

            if (actualIndex !== -1) {
                currentItems.splice(actualIndex, 1);
                localStorage.setItem("portfoliosData", JSON.stringify(allPortfolios));
            }

            // ข้อความ "Deleted"
            itemDiv.innerHTML = `<p style="margin: 0; padding: 12px 0; text-align: center; color: #dc3545; font-weight: 600;">Deleted!</p>`;
            
            requestAnimationFrame(() => {
                itemDiv.style.opacity = "0";
            });

            // ลบกล่องหลังจากจางหายสนิท
            setTimeout(() => {
                itemDiv.remove();
                if (itemsContainer.children.length === 0) {
                    itemsContainer.innerHTML = "<p>ยังไม่มีรายการ Portfolio Item</p>";
                }
            }, 800);
        }
    }

    
});
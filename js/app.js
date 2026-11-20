// ที่อยู่ API ฝั่ง Server (ถ้า Server อยู่คนละโดเมน ให้ใส่ URL เต็ม เช่น "https://your-ec2/server/api.php"
// และตั้ง ALLOWED_ORIGIN ใน server/api.php ให้ตรงกับโดเมนของเว็บนี้)
const API_URL = "server/api.php";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#item-form");
    const portfolioSelect = document.querySelector("#portfolio-select");
    const itemsContainer = document.querySelector("#items-container");
    const newPortfolioInput = document.querySelector("#new-portfolio-name");
    const addPortfolioBtn = document.querySelector("#add-portfolio-btn");
    const deletePortfolioBtn = document.querySelector("#delete-portfolio-btn");
    const importJsonInput = document.querySelector("#import-item-json");
    const importItemBtn = document.querySelector("#import-item-btn");
    const importFileInput = document.querySelector("#import-item-file");
    const serverAlert = document.querySelector("#server-alert");
    const serverAlertText = document.querySelector("#server-alert-text");
    const serverRetryBtn = document.querySelector("#server-retry-btn");

    // ข้อมูลล่าสุดที่ได้จาก Server (เก็บในหน่วยความจำเท่านั้น ไม่เขียนลง localStorage)
    let portfolios = {};

    loadFromServer();

    // =====================================================
    // Data flow: Client <-> Server
    // =====================================================

    async function apiRequest(payload) {
        let response;
        try {
            response = await fetch(API_URL, payload
                ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
                : { method: "GET", cache: "no-store" });
        } catch (error) {
            throw new Error("เชื่อมต่อ Server ไม่ได้");
        }

        let data = null;
        try {
            data = await response.json();
        } catch (error) {
            // Server ตอบกลับมาไม่ใช่ JSON
        }

        if (!response.ok || !data || data.success !== true) {
            const firstDetail = Array.isArray(data?.details) && data.details.length > 0 ? data.details[0] : "";
            throw new Error(firstDetail || data?.error || `Server error (${response.status})`);
        }
        return data;
    }

    async function loadFromServer() {
        try {
            const data = await apiRequest();
            portfolios = data.portfolios || {};
            hideServerAlert();
            loadPortfolioOptions();
            renderItems();
        } catch (error) {
            showServerAlert(error.message);
        }
    }

    function applyServerData(data) {
        portfolios = data.portfolios || portfolios;
        loadPortfolioOptions();
        renderItems();
    }

    function showServerAlert(message) {
        serverAlertText.textContent = `โหลดข้อมูลจาก Server ไม่สำเร็จ: ${message}`;
        serverAlert.classList.remove("d-none");
    }

    function hideServerAlert() {
        serverAlert.classList.add("d-none");
    }

    serverRetryBtn.addEventListener("click", loadFromServer);

    // ปิดปุ่มระหว่างรอ Server กันกดซ้ำ และแจ้ง error บนปุ่มเดิม
    async function guarded(btn, task) {
        if (btn.disabled) return;
        btn.disabled = true;
        try {
            await task();
        } catch (error) {
            showButtonNotif(btn, error.message, true);
        } finally {
            btn.disabled = false;
        }
    }

    // =====================================================
    // Profile
    // =====================================================

    addPortfolioBtn.addEventListener("click", () => {
        const name = newPortfolioInput.value.trim();
        if (!name) {
            showButtonNotif(addPortfolioBtn, "Need name bro", true);
            return;
        }

        guarded(addPortfolioBtn, async () => {
            const data = await apiRequest({ action: "addProfile", name });
            newPortfolioInput.value = "";
            applyServerData(data);
            portfolioSelect.value = data.id;
            renderItems();
            showButtonNotif(addPortfolioBtn, `Added "${name}" profile`);
        });
    });

    let deleteProfileTimer = null;
    deletePortfolioBtn.addEventListener("click", () => {
        const selectedPortfolio = portfolioSelect.value;
        const portfolioName = portfolios[selectedPortfolio]?.name || selectedPortfolio;

        if (Object.keys(portfolios).length <= 1) {
            showButtonNotif(deletePortfolioBtn, "อย่างน้อย 1 Profile ในระบบ", true);
            return;
        }

        if (deletePortfolioBtn.dataset.confirming !== "true") {
            deletePortfolioBtn.dataset.confirming = "true";
            showButtonNotif(deletePortfolioBtn, "U sure?", true);

            clearTimeout(deleteProfileTimer);
            deleteProfileTimer = setTimeout(() => {
                delete deletePortfolioBtn.dataset.confirming;
            }, 3000);
            return;
        }

        clearTimeout(deleteProfileTimer);
        delete deletePortfolioBtn.dataset.confirming;

        guarded(deletePortfolioBtn, async () => {
            const data = await apiRequest({ action: "deleteProfile", id: selectedPortfolio });
            applyServerData(data);
            showButtonNotif(deletePortfolioBtn, `ลบ "${portfolioName}"`);
        });
    });

    function loadPortfolioOptions() {
        const currentSelected = portfolioSelect.value;
        portfolioSelect.innerHTML = "";

        Object.keys(portfolios).forEach(id => {
            const option = document.createElement("option");
            option.value = id;
            option.textContent = portfolios[id].name || id;
            portfolioSelect.appendChild(option);
        });

        if (currentSelected && portfolios[currentSelected]) {
            portfolioSelect.value = currentSelected;
        } else {
            portfolioSelect.selectedIndex = 0;
        }
    }

    portfolioSelect.addEventListener("change", renderItems);

    // =====================================================
    // บันทึก Item (ใช้ร่วมกันทั้งฟอร์มปกติ / Import)
    // =====================================================

    // ส่ง Item ไปให้ Server ตรวจและบันทึก เมื่อสำเร็จจะเปิดใบเกียรติบัตรให้ทันที
    async function saveItemToServer(item, btn, successMessage) {
        const portfolioId = portfolioSelect.value;
        if (!portfolioId) {
            throw new Error("กรุณาเลือก Profile ก่อนบันทึก");
        }

        const data = await apiRequest({ action: "addItem", portfolioId, item });
        applyServerData(data);
        showButtonNotif(btn, successMessage || "Saved!");

        const profileName = portfolios[portfolioId]?.name || "";
        Certificate.open(data.item, profileName);
        return data.item;
    }

    // ฟอร์ม Add Portfolio Item
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');

        const newItem = {
            id: document.querySelector("#item-id").value.trim() || "item_" + Date.now(),
            title: document.querySelector("#item-title").value.trim(),
            type: document.querySelector("#item-type").value.trim(),
            date: document.querySelector("#item-date").value,
            role: document.querySelector("#item-role").value.trim(),
            description: document.querySelector("#item-description").value.trim(),
            skills: splitList(document.querySelector("#item-skills").value, ","),
            reflection: {
                whatIDid: document.querySelector("#item-what-did").value.trim(),
                whatILearned: document.querySelector("#item-what-learned").value.trim(),
                challenge: document.querySelector("#item-challenge").value.trim(),
                nextStep: document.querySelector("#item-next-step").value.trim()
            },
            evidence: [document.querySelector("#item-evidence").value.trim()]
        };

        guarded(submitBtn, async () => {
            await saveItemToServer(newItem, submitBtn);
            form.reset();
        });
    });

    // =====================================================
    // Import
    // =====================================================

    importItemBtn.addEventListener("click", () => {
        const file = importFileInput.files[0];
        const rawJson = importJsonInput.value.trim();

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                processAndImportJSON(e.target.result);
            };
            reader.onerror = () => {
                showButtonNotif(importItemBtn, "Cannot read file", true);
            };
            reader.readAsText(file);
        } else if (rawJson) {
            processAndImportJSON(rawJson);
        } else {
            showButtonNotif(importItemBtn, "Too empty", true);
        }
    });

    function processAndImportJSON(rawJson) {
        let importData;
        try {
            importData = JSON.parse(rawJson);
        } catch (error) {
            showButtonNotif(importItemBtn, "Wrong format", true);
            return;
        }

        if (!importData || !importData.title || !importData.type || !importData.date || !importData.role || !importData.description) {
            showButtonNotif(importItemBtn, "ข้อมูล Item ไม่ครบ", true);
            return;
        }

        const importedItem = {
            id: String(importData.id || "item_" + Date.now()).trim(),
            title: String(importData.title).trim(),
            type: String(importData.type).trim(),
            date: String(importData.date).trim(),
            role: String(importData.role).trim(),
            description: String(importData.description).trim(),
            skills: Array.isArray(importData.skills)
                ? importData.skills.map(s => String(s).trim()).filter(Boolean)
                : typeof importData.skills === "string"
                    ? splitList(importData.skills, ",")
                    : [],
            reflection: {
                whatIDid: String(importData.reflection?.whatIDid || "-").trim(),
                whatILearned: String(importData.reflection?.whatILearned || "-").trim(),
                challenge: String(importData.reflection?.challenge || "-").trim(),
                nextStep: String(importData.reflection?.nextStep || "-").trim()
            },
            // ไม่ใส่ค่าเดา (เช่น "#") แทนหลักฐานที่ขาด ให้ Server ตรวจและแจ้งว่าต้องมี Evidence จริง
            evidence: Array.isArray(importData.evidence)
                ? importData.evidence.map(e => String(e).trim()).filter(Boolean)
                : importData.evidence
                    ? [String(importData.evidence).trim()]
                    : []
        };

        guarded(importItemBtn, async () => {
            await saveItemToServer(importedItem, importItemBtn, `Import "${importedItem.title}" สำเร็จ!`);
            importJsonInput.value = "";
            importFileInput.value = "";
        });
    }

    // =====================================================
    // แสดงรายการ
    // =====================================================

    function renderItems() {
        const selectedPortfolio = portfolioSelect.value;
        const items = portfolios[selectedPortfolio]?.items || [];
        const profileName = portfolios[selectedPortfolio]?.name || "";

        itemsContainer.innerHTML = items.length === 0 ? "<p>ยังไม่มีรายการ Portfolio Item</p>" : "";

        items.forEach((item) => {
            const evidenceLinks = (item.evidence || []).map(url => {
                const safe = safeHttpUrl(url);
                return safe
                    ? `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${escapeHtml(safe)}</a>`
                    : escapeHtml(url);
            }).join("<br>");

            const itemDiv = document.createElement("div");
            itemDiv.style.border = "1px solid #ccc";
            itemDiv.style.padding = "10px";
            itemDiv.style.marginBottom = "10px";
            itemDiv.style.opacity = "1";
            itemDiv.style.transition = "opacity 0.8s ease";

            itemDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <h3 style="margin: 0;">[${escapeHtml(item.id)}] ${escapeHtml(item.title)} <a style="font-size: small">(${escapeHtml(item.type)})</a></h3>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        <button type="button" class="certificate-item-btn btn btn-outline-success btn-sm"><i class="bi bi-award"></i> Certificate</button>
                        <button type="button" class="copy-item-btn btn btn-outline-secondary btn-sm">Copy JSON</button>
                        <button type="button" class="export-item-btn btn btn-outline-dark btn-sm">Export .json</button>
                        <button type="button" class="delete-item-btn" style="color: red;">ลบ</button>
                    </div>
                </div>
                <p><strong>Date:</strong> ${escapeHtml(item.date)} | <strong>Role:</strong> ${escapeHtml(item.role)}</p>
                <p><strong>Description:</strong> ${escapeHtml(item.description)}</p>
                <p><strong>Skills:</strong> ${escapeHtml((item.skills || []).join(", "))}</p>
                <details>
                <summary><strong>Reflection</strong></summary>
                <ul>
                <li><strong>What I Did:</strong> ${escapeHtml(item.reflection?.whatIDid)}</li>
                <li><strong>Learned:</strong> ${escapeHtml(item.reflection?.whatILearned)}</li>
                <li><strong>Challenge:</strong> ${escapeHtml(item.reflection?.challenge)}</li>
                <li><strong>Next:</strong> ${escapeHtml(item.reflection?.nextStep)}</li>
                </ul>
                </details>
                <p><strong>Evidence:</strong> ${evidenceLinks}</p>
            `;

            itemDiv.querySelector(".certificate-item-btn").addEventListener("click", () => {
                Certificate.open(item, profileName);
            });

            itemDiv.querySelector(".copy-item-btn").addEventListener("click", (e) => {
                copyJSONToClipboard(getItemJsonData(item), e.currentTarget, "Copied JSON!");
            });

            itemDiv.querySelector(".export-item-btn").addEventListener("click", (e) => {
                const safeFilename = `${item.id || "portfolio-item"}.json`;
                downloadJSON(getItemJsonData(item), safeFilename);
                showButtonNotif(e.currentTarget, `Exported ${safeFilename}`);
            });

            itemDiv.querySelector(".delete-item-btn").addEventListener("click", (e) => {
                deleteItem(item, itemDiv, e.currentTarget);
            });

            itemsContainer.appendChild(itemDiv);
        });
    }

    function deleteItem(targetItem, itemDiv, btn) {
        const portfolioId = portfolioSelect.value;

        guarded(btn, async () => {
            const data = await apiRequest({ action: "deleteItem", portfolioId, itemId: targetItem.id });
            portfolios = data.portfolios || portfolios;

            itemDiv.innerHTML = `<p style="margin: 0; padding: 12px 0; text-align: center; color: #dc3545; font-weight: 600;">Deleted!</p>`;
            requestAnimationFrame(() => {
                itemDiv.style.opacity = "0";
            });

            setTimeout(() => {
                itemDiv.remove();
                if (itemsContainer.children.length === 0) {
                    itemsContainer.innerHTML = "<p>ยังไม่มีรายการ Portfolio Item</p>";
                }
            }, 800);
        });
    }

    // =====================================================
    // Utility
    // =====================================================

    function splitList(text, separator) {
        return String(text).split(separator).map(s => s.trim()).filter(Boolean);
    }

    // กัน XSS: ข้อมูลที่ผู้ใช้กรอกถูกเก็บบน Server แล้วแสดงซ้ำ จึงต้อง escape ก่อนใส่ลง innerHTML ทุกครั้ง
    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function safeHttpUrl(url) {
        const trimmed = String(url ?? "").trim();
        return /^https?:\/\//i.test(trimmed) ? trimmed : "";
    }

    function getItemJsonData(item) {
        const jsonData = { ...item };
        delete jsonData.name;
        delete jsonData.items;
        return jsonData;
    }

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

    // การ์ดแจ้งเตือน
    function showButtonNotif(btnElement, message, isError = false) {
        if (btnElement._notifEl) {
            btnElement._notifEl.remove();
        }

        const notif = document.createElement("div");
        notif.className = "btn-notif-card";
        if (isError) notif.classList.add("is-error");

        const icon = document.createElement("i");
        icon.className = `bi ${isError ? "bi-exclamation-circle" : "bi-check-circle-fill"}`;
        const text = document.createElement("span");
        text.textContent = ` ${message}`;
        notif.append(icon, text);

        document.body.appendChild(notif);
        btnElement._notifEl = notif;

        const rect = btnElement.getBoundingClientRect();
        const notifRect = notif.getBoundingClientRect();
        const top = rect.top + window.scrollY - notifRect.height - 8;
        let left = rect.left + window.scrollX + (rect.width / 2) - (notifRect.width / 2);

        const maxLeft = window.scrollX + window.innerWidth - notifRect.width - 8;
        left = Math.min(Math.max(8, left), maxLeft);

        notif.style.top = `${Math.max(8, top)}px`;
        notif.style.left = `${left}px`;

        requestAnimationFrame(() => {
            notif.classList.add("show");
        });

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
});

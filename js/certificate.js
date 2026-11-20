const Certificate = (() => {

    // ===================== ตั้งค่าที่แก้ได้ =====================
    const CERT_CONFIG = {
        // ข้อความหลัก
        heading: "ใบเกียรติบัตร",
        subHeading: "Certificate of Achievement",
        presentedTo: "ขอมอบเกียรติบัตรฉบับนี้ให้แก่",

        // ข้อความบรรยาย ใช้ {title} {type} {role} แทนค่าจาก Portfolio Item ได้
        body: "ในฐานะ {role} สำหรับผลงาน “{title}” ประเภท {type} ซึ่งได้บันทึกไว้ในแฟ้มสะสมผลงานเรียบร้อยแล้ว",

        skillsLabel: "ทักษะที่ได้รับ",
        dateLabel: "วันที่ของผลงาน",
        evidenceLabel: "หลักฐานอ้างอิง",

        // เปิด/ปิดส่วนต่าง ๆ
        showSkills: true,
        showEvidence: true,
        maxSkills: 8,

        locale: "th-TH"
    };

    const OVERLAY_ID = "certificate-overlay";

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function safeHttpUrl(url) {
        return /^https?:\/\//i.test(String(url || "").trim()) ? String(url).trim() : "";
    }

    function formatDate(isoDate) {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate || ""));
        if (!m) return escapeHtml(isoDate || "-");
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return escapeHtml(d.toLocaleDateString(CERT_CONFIG.locale, { year: "numeric", month: "long", day: "numeric" }));
    }

    function fillBody(template, item) {
        const values = { title: item.title, type: item.type, role: item.role };
        return escapeHtml(template).replace(/\{(title|type|role)\}/g, (_, key) => `<strong>${escapeHtml(values[key])}</strong>`);
    }

    // ---------- โครงสร้าง HTML ของใบเกียรติบัตร ----------
    function buildCertificateHTML(item, profileName) {
        const c = CERT_CONFIG;
        const skills = Array.isArray(item.skills) ? item.skills.slice(0, c.maxSkills) : [];
        const evidenceUrl = Array.isArray(item.evidence) ? safeHttpUrl(item.evidence[0]) : "";

        return `
        <div class="certificate" role="img" aria-label="${escapeHtml(c.heading)} ${escapeHtml(item.title)}">
            <div class="certificate-frame">
                <div class="certificate-corner tl"></div>
                <div class="certificate-corner tr"></div>
                <div class="certificate-corner bl"></div>
                <div class="certificate-corner br"></div>

                <div class="certificate-issuer">${escapeHtml(c.issuer)}</div>
                <h1 class="certificate-heading">${escapeHtml(c.heading)}</h1>
                <div class="certificate-subheading">${escapeHtml(c.subHeading)}</div>

                <div class="certificate-presented">${escapeHtml(c.presentedTo)}</div>
                <div class="certificate-name">${escapeHtml(profileName || "-")}</div>
                <p class="certificate-body">${fillBody(c.body, item)}</p>

                ${c.showSkills && skills.length ? `
                <div class="certificate-skills">
                    <span class="certificate-label">${escapeHtml(c.skillsLabel)}</span>
                    ${skills.map(s => `<span class="certificate-chip">${escapeHtml(s)}</span>`).join("")}
                </div>` : ""}

                ${c.showEvidence && evidenceUrl ? `
                <div class="certificate-evidence">
                    <span class="certificate-label">${escapeHtml(c.evidenceLabel)}</span>
                    ${escapeHtml(evidenceUrl)}
                </div>` : ""}

                <div class="certificate-footer-row">
                    <div class="certificate-meta">
                        <div><span class="certificate-label">${escapeHtml(c.dateLabel)}</span> ${formatDate(item.date)}</div>
                    </div>
                    <div class="certificate-seal"><i class="bi bi-award-fill"></i></div>
                    <div class="certificate-signature">
                        <div class="certificate-signature-line"></div>
                        <div class="certificate-signer">${escapeHtml(c.signerName)}</div>
                        <div class="certificate-signer-title">${escapeHtml(c.signerTitle)}</div>
                    </div>
                </div>
                <div class="certificate-footnote">${escapeHtml(c.footer)}</div>
            </div>
        </div>`;
    }

    // ---------- popup ----------
    function close() {
        const overlay = document.getElementById(OVERLAY_ID);
        if (overlay) overlay.remove();
        document.removeEventListener("keydown", onKeyDown);
        document.body.classList.remove("certificate-open");
    }

    function onKeyDown(event) {
        if (event.key === "Escape") close();
    }

    function open(item, profileName) {
        close();

        const overlay = document.createElement("div");
        overlay.id = OVERLAY_ID;
        overlay.className = "certificate-overlay";
        overlay.innerHTML = `
            <div class="certificate-dialog">
                <div class="certificate-toolbar">
                    <button type="button" class="btn btn-brand btn-sm" data-cert-action="print">
                        <i class="bi bi-printer"></i> พิมพ์ / บันทึกเป็น PDF
                    </button>
                    <button type="button" class="btn btn-outline-light btn-sm" data-cert-action="close">
                        <i class="bi bi-x-lg"></i> ปิด
                    </button>
                </div>
                ${buildCertificateHTML(item, profileName)}
            </div>`;

        overlay.addEventListener("click", (event) => {
            const action = event.target.closest("[data-cert-action]")?.dataset.certAction;
            if (action === "print") window.print();
            if (action === "close" || event.target === overlay) close();
        });

        document.body.appendChild(overlay);
        document.body.classList.add("certificate-open");
        document.addEventListener("keydown", onKeyDown);
    }

    return { open, close, config: CERT_CONFIG, buildHTML: buildCertificateHTML };
})();

/**
 * 宜和医院收费单据打印系统 - 核心逻辑
 * 版本: 2.1
 */

const type = localStorage.getItem("type");

// 初始化
if (document.getElementById("title")) {
    initFormPage();
}

/**
 * 初始化表单页面
 */
function initFormPage() {
    // 设置页面标题
    document.getElementById("title").innerText = type === "opd" ? "门诊收费信息录入" : "住院收费信息录入";

    // 根据类型显示/隐藏字段
    if (type === "ipd") {
        document.getElementById("visitDateRow").style.display = "none";
        document.getElementById("admitDateRow").style.display = "flex";
        document.getElementById("prepayRow").style.display = "flex";
        document.getElementById("balanceRow").style.display = "flex";
    }

    // 生成编号和设置日期
    document.getElementById("no").innerText = genNo();
    const now = new Date();
    document.getElementById("date").innerText = formatDateTime(now);
    
    // 设置默认日期
    const today = now.toISOString().slice(0, 10);
    if (document.getElementById("visitDate")) document.getElementById("visitDate").value = today;
    if (document.getElementById("admitDate")) document.getElementById("admitDate").value = today;

    // 生成费用输入字段
    generateFeeFields();
    
    // 加载草稿
    loadDraft();
    
    // 绑定事件
    bindEvents();
}

/**
 * 绑定事件处理
 */
function bindEvents() {
    // 费用输入事件
    document.querySelectorAll(".fee").forEach(input => {
        input.addEventListener("input", function() {
            this.classList.toggle("has-value", parseFloat(this.value) > 0);
            calculateTotal();
        });
        input.addEventListener("focus", function() { 
            this.select(); 
        });
        // 添加键盘导航
        input.addEventListener("keydown", function(e) {
            if (e.key === "Enter") {
                const inputs = Array.from(document.querySelectorAll(".fee"));
                const currentIndex = inputs.indexOf(this);
                if (currentIndex < inputs.length - 1) {
                    inputs[currentIndex + 1].focus();
                } else {
                    document.getElementById("paid").focus();
                }
            }
        });
    });

    // 预付款和实付金额变化时重新计算
    const prepayInput = document.getElementById("prepay");
    if (prepayInput) prepayInput.addEventListener("input", calculateBalance);
    
    const paidInput = document.getElementById("paid");
    if (paidInput) paidInput.addEventListener("input", calculateBalance);
    
    // 快捷键支持
    document.addEventListener("keydown", function(e) {
        if (e.ctrlKey && e.key === 's') { 
            e.preventDefault(); 
            saveDraft(); 
        }
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            submitForm();
        }
    });
}

/**
 * 生成收据编号
 * 格式: YYYYMMDD + 三位序号
 */
function genNo() {
    const d = new Date();
    const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
    const records = JSON.parse(localStorage.getItem("receiptHistory") || "[]");
    const todayRecords = records.filter(r => r.no && r.no.startsWith(dateStr));
    return dateStr + String(todayRecords.length + 1).padStart(3, "0");
}

/**
 * 格式化日期时间
 */
function formatDateTime(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const h = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${d} ${h}:${min}`;
}

/**
 * 生成费用输入字段
 */
function generateFeeFields() {
    const feeArea = document.getElementById("feeArea");
    if (!feeArea) return;

    const opdFields = [
        { name: "药费", icon: "💊" }, { name: "西药", icon: "💉" },
        { name: "中成药", icon: "🌿" }, { name: "中草药", icon: "🍃" },
        { name: "药事服务费", icon: "📋" }, { name: "诊查费", icon: "👨‍⚕️" },
        { name: "急诊留观床位费", icon: "🛏️" }, { name: "检查费", icon: "🔍" },
        { name: "B超", icon: "📊" }, { name: "CT", icon: "🖥️" },
        { name: "治疗费", icon: "🏥" }, { name: "输血费", icon: "🩸" },
        { name: "手术费", icon: "🔪" }, { name: "卫生材料费", icon: "📦" },
        { name: "化验费", icon: "🧪" }, { name: "其他", icon: "📝" }
    ];

    const ipdFields = [
        { name: "药费", icon: "💊" }, { name: "西药", icon: "💉" },
        { name: "中成药", icon: "🌿" }, { name: "中草药", icon: "🍃" },
        { name: "药事服务费", icon: "📋" }, { name: "床位费", icon: "🛏️" },
        { name: "诊查费", icon: "👨‍⚕️" }, { name: "检查费", icon: "🔍" },
        { name: "B超", icon: "📊" }, { name: "CT", icon: "🖥️" },
        { name: "治疗费", icon: "🏥" }, { name: "输血费", icon: "🩸" },
        { name: "手术费", icon: "🔪" }, { name: "卫生材料费", icon: "📦" },
        { name: "护理费", icon: "👩‍⚕️" }, { name: "化验费", icon: "🧪" },
        { name: "其他", icon: "📝" }
    ];

    const fields = type === "opd" ? opdFields : ipdFields;

    feeArea.innerHTML = fields.map(f => `
        <div class="fee-item">
            <span class="fee-icon">${f.icon}</span>
            <label>${f.name}</label>
            <input class="fee" data-name="${f.name}" type="number" step="0.01" placeholder="0.00" min="0">
        </div>
    `).join("");
}

/**
 * 计算总金额
 */
function calculateTotal() {
    let sum = 0;
    document.querySelectorAll(".fee").forEach(i => {
        sum += Math.round((parseFloat(i.value) || 0) * 100);
    });
    const total = (sum / 100).toFixed(2);
    document.getElementById("total").value = total;
    
    // 自动填充实付金额
    const paidInput = document.getElementById("paid");
    if (paidInput && !paidInput.value && parseFloat(total) > 0) {
        paidInput.value = total;
    }
    calculateBalance();
}

/**
 * 计算补收/退款
 */
function calculateBalance() {
    const total = Math.round((parseFloat(document.getElementById("total").value) || 0) * 100);
    const prepay = Math.round((parseFloat(document.getElementById("prepay")?.value) || 0) * 100);
    const balanceInput = document.getElementById("balance");

    if (balanceInput) {
        if (prepay > 0) {
            const diff = (total - prepay) / 100;
            if (diff > 0) {
                balanceInput.value = `补收 $${diff.toFixed(2)}`;
                balanceInput.className = "balance-input extra";
            } else if (diff < 0) {
                balanceInput.value = `退款 $${Math.abs(diff).toFixed(2)}`;
                balanceInput.className = "balance-input refund";
            } else {
                balanceInput.value = "已结清";
                balanceInput.className = "balance-input";
            }
        } else {
            balanceInput.value = "";
            balanceInput.className = "balance-input";
        }
    }
}

/**
 * 提交表单
 */
function submitForm() {
    // 表单验证
    const name = document.getElementById("name").value.trim();
    const gender = document.getElementById("gender").value;
    const age = document.getElementById("age").value;
    const cashier = document.getElementById("cashier")?.value;
    
    if (!name) { 
        alert("请输入患者姓名！"); 
        document.getElementById("name").focus(); 
        return; 
    }
    if (!gender) { 
        alert("请选择性别！"); 
        document.getElementById("gender").focus(); 
        return; 
    }
    if (!age || age <= 0 || age > 150) { 
        alert("请输入正确的年龄！"); 
        document.getElementById("age").focus(); 
        return; 
    }
    if (!cashier) { 
        alert("请选择收费员！"); 
        document.getElementById("cashier").focus(); 
        return; 
    }
    
    const total = document.getElementById("total").value;
    if (!total || parseFloat(total) <= 0) { 
        alert("请至少输入一项收费金额！"); 
        return; 
    }
    
    const paid = document.getElementById("paid").value;
    if (!paid || parseFloat(paid) < 0) { 
        alert("请输入实付金额！"); 
        document.getElementById("paid").focus(); 
        return; 
    }

    // 构建数据对象
    const data = {
        no: document.getElementById("no").innerText,
        date: document.getElementById("date").innerText,
        name: name, 
        gender: gender, 
        age: age,
        doctor: document.getElementById("doctor")?.value || "",
        cashier: cashier,
        visitDate: document.getElementById("visitDate")?.value || "",
        admitDate: document.getElementById("admitDate")?.value || "",
        total: total, 
        paid: paid,
        payMethod: document.getElementById("payMethod")?.value || "现金",
        prepay: document.getElementById("prepay")?.value || "0",
        type: type, 
        fees: {}
    };

    // 收集费用数据
    document.querySelectorAll(".fee").forEach(i => {
        const val = parseFloat(i.value);
        if (val > 0) data.fees[i.dataset.name] = val.toFixed(2);
    });

    // 保存数据
    localStorage.setItem("printData", JSON.stringify(data));
    saveToHistory(data);
    localStorage.removeItem("draft_" + type);
    
    // 打开打印页面
    const printWindow = window.open(type === "opd" ? "print_opd.html" : "print_ipd.html", "_blank");
    
    // 询问是否继续录入
    setTimeout(() => {
        if (confirm("收据已生成！是否继续录入下一位患者？")) {
            resetForm();
        } else {
            window.location.href = "index.html";
        }
    }, 500);
}

/**
 * 保存到历史记录
 */
function saveToHistory(data) {
    let history = JSON.parse(localStorage.getItem("receiptHistory") || "[]");
    const exists = history.some(r => r.no === data.no);
    if (!exists) {
        history.push(data);
        localStorage.setItem("receiptHistory", JSON.stringify(history));
    }
}

/**
 * 保存草稿
 */
function saveDraft() {
    const data = {
        name: document.getElementById("name").value,
        gender: document.getElementById("gender").value,
        age: document.getElementById("age").value,
        doctor: document.getElementById("doctor")?.value || "",
        cashier: document.getElementById("cashier")?.value || "",
        visitDate: document.getElementById("visitDate")?.value || "",
        admitDate: document.getElementById("admitDate")?.value || "",
        paid: document.getElementById("paid").value,
        payMethod: document.getElementById("payMethod")?.value || "",
        prepay: document.getElementById("prepay")?.value || "",
        fees: {}
    };
    document.querySelectorAll(".fee").forEach(i => {
        if (i.value) data.fees[i.dataset.name] = i.value;
    });
    localStorage.setItem("draft_" + type, JSON.stringify(data));
    
    // 显示保存成功提示
    showToast("草稿已保存！");
}

/**
 * 显示提示消息
 */
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #4caf50;
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        font-size: 14px;
        z-index: 1000;
        animation: fadeInDown 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOutUp 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

/**
 * 加载草稿
 */
function loadDraft() {
    const draft = localStorage.getItem("draft_" + type);
    if (!draft) return;
    try {
        const data = JSON.parse(draft);
        if (data.name) document.getElementById("name").value = data.name;
        if (data.gender) document.getElementById("gender").value = data.gender;
        if (data.age) document.getElementById("age").value = data.age;
        if (data.doctor) document.getElementById("doctor").value = data.doctor;
        if (data.cashier) document.getElementById("cashier").value = data.cashier;
        if (data.visitDate) document.getElementById("visitDate").value = data.visitDate;
        if (data.admitDate) document.getElementById("admitDate").value = data.admitDate;
        if (data.paid) document.getElementById("paid").value = data.paid;
        if (data.payMethod) document.getElementById("payMethod").value = data.payMethod;
        if (data.prepay) document.getElementById("prepay").value = data.prepay;
        for (let key in data.fees) {
            const input = document.querySelector(`.fee[data-name="${key}"]`);
            if (input) {
                input.value = data.fees[key];
                input.classList.toggle("has-value", parseFloat(data.fees[key]) > 0);
            }
        }
        calculateTotal();
    } catch(e) { 
        console.error("加载草稿失败", e); 
    }
}

/**
 * 重置表单
 */
function resetForm() {
    const doctor = document.getElementById("doctor")?.value || "";
    const cashier = document.getElementById("cashier")?.value || "";
    document.getElementById("name").value = "";
    document.getElementById("gender").value = "";
    document.getElementById("age").value = "";
    if (document.getElementById("doctor")) document.getElementById("doctor").value = doctor;
    if (document.getElementById("cashier")) document.getElementById("cashier").value = cashier;
    document.getElementById("paid").value = "";
    if (document.getElementById("prepay")) document.getElementById("prepay").value = "0";
    document.querySelectorAll(".fee").forEach(input => {
        input.value = "";
        input.classList.remove("has-value");
    });
    calculateTotal();
    document.getElementById("no").innerText = genNo();
    const today = new Date().toISOString().slice(0, 10);
    if (document.getElementById("visitDate")) document.getElementById("visitDate").value = today;
    if (document.getElementById("admitDate")) document.getElementById("admitDate").value = today;
}

/**
 * 清空所有费用
 */
function clearAllFees() {
    if(confirm('确定要清空所有费用项目吗？')) {
        document.querySelectorAll('.fee').forEach(input => {
            input.value = '';
            input.classList.remove('has-value');
        });
        calculateTotal();
    }
}

/**
 * 填充模板
 */
function fillTemplate(templateType) {
    const templates = {
        common: { '诊查费': 50, '药事服务费': 15 },
        check: { '诊查费': 50, '检查费': 200, 'B超': 100, '化验费': 150 }
    };
    
    const hasValues = Array.from(document.querySelectorAll('.fee')).some(i => parseFloat(i.value) > 0);
    if (hasValues && !confirm('确定要填充模板吗？这将覆盖现有数据。')) {
        return;
    }
    
    clearAllFees();
    const data = templates[templateType];
    for(let key in data) {
        const input = document.querySelector(`.fee[data-name="${key}"]`);
        if(input) {
            input.value = data[key];
            input.classList.add('has-value');
        }
    }
    calculateTotal();
}

/**
 * 返回首页
 */
function goBack() {
    if (confirm("确定要返回首页吗？未保存的数据将丢失。")) {
        window.location.href = "index.html";
    }
}

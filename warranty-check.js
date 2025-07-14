/**
 * نظام فحص ضمان النظارات - بدون Google Sheets API
 * 
 * هذا السكريبت يتعامل مع التحقق من رموز الضمان باستخدام Google Sheets CSV export
 * ويوفر تحديثات ديناميكية لواجهة المستخدم لنموذج فحص الضمان.
 * 
 * المتطلبات: Bootstrap 5.3.3, Font Awesome 6.6.0
 * 
 * تعليمات الإعداد:
 * 1. إنشاء جدول Google Sheets مع الأعمدة: id, fName, lName, warantyKey, warantyPeriod, endDate, model
 * 2. جعل الجدول عام (مشاركة > أي شخص لديه الرابط يمكنه العرض)
 * 3. الحصول على معرف الجدول من الرابط
 * 4. استبدال SPREADSHEET_ID أدناه بمعرف جدولك
 * 5. تأكد من أن الجدول يحتوي على البيانات في الصفحة الأولى (Sheet1)
 */

// الإعدادات - استبدل هذه القيم بقيمك الفعلية
const CONFIG = {
    // احصل على هذا من رابط Google Sheet: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
    SPREADSHEET_ID: '1o7IQDZpWdraDyl8AgIWKoEkYcKYfyaDEseCoinEYEaU',
    
    // اسم الصفحة في الجدول (عادة Sheet1)
    SHEET_NAME: '1',
    
    // خريطة الأعمدة (عدل حسب هيكل جدولك)
    COLUMNS: {
        ID: 0,               // العمود الأول - المعرف
        FIRST_NAME: 1,       // العمود الثاني - الاسم الأول
        LAST_NAME: 2,        // العمود الثالث - الاسم الأخير
        WARRANTY_CODE: 3,    // العمود الرابع - رمز الضمان
        WARRANTY_PERIOD: 4,  // العمود الخامس - فترة الضمان
        END_DATE: 5,         // العمود السادس - تاريخ انتهاء الضمان
        MODEL: 6             // العمود السابع - موديل النظارة
    }
};

/**
 * عناصر DOM
 */
let elements = {};

/**
 * تهيئة التطبيق
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 تم تحميل الصفحة، بدء التهيئة...');
    
    // الحصول على عناصر DOM
    elements = {
        form: document.getElementById('warrantyForm'),
        warrantyCodeInput: document.getElementById('warrantyCode'),
        submitBtn: document.getElementById('submitBtn'),
        loadingSpinner: document.getElementById('loadingSpinner'),
        resultsContainer: document.getElementById('resultsContainer')
    };
    
    // التحقق من وجود العناصر
    if (!elements.form || !elements.warrantyCodeInput || !elements.submitBtn) {
        console.error('❌ لم يتم العثور على عناصر النموذج المطلوبة');
        return;
    }
    
    console.log('✅ تم العثور على جميع عناصر DOM');
    
    initializeEventListeners();
    validateConfiguration();
    addWelcomeAnimation();
});

/**
 * إعداد مستمعي الأحداث للتفاعل مع النموذج
 */
function initializeEventListeners() {
    console.log('🔧 إعداد مستمعي الأحداث...');
    
    // إرسال النموذج
    elements.form.addEventListener('submit', function(event) {
        console.log('📝 تم إرسال النموذج');
        handleFormSubmit(event);
    });
    
    // التحقق من الإدخال أثناء الكتابة
    elements.warrantyCodeInput.addEventListener('input', handleInputValidation);
    
    // مسح التحقق عند التركيز
    elements.warrantyCodeInput.addEventListener('focus', clearValidation);
    
    // التعامل مع مفتاح Enter
    elements.warrantyCodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            console.log('⌨️ تم الضغط على Enter');
            e.preventDefault();
            handleFormSubmit(e);
        }
    });

    // تأثيرات الماوس للزر
    elements.submitBtn.addEventListener('mouseenter', function() {
        this.classList.remove('pulse');
    });

    elements.submitBtn.addEventListener('mouseleave', function() {
        if (!this.disabled) {
            this.classList.add('pulse');
        }
    });
    
    console.log('✅ تم إعداد جميع مستمعي الأحداث');
}

/**
 * إضافة أنيميشن ترحيبي
 */
function addWelcomeAnimation() {
    const card = document.querySelector('.warranty-card');
    if (card) {
        setTimeout(() => {
            card.style.transform = 'translateY(0) scale(1)';
            card.style.opacity = '1';
        }, 300);
    }
}

/**
 * التحقق من الإعدادات وإظهار تحذير إذا لم يتم الإعداد
 */
function validateConfiguration() {
    if (CONFIG.SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') {
        console.warn('⚠️ لم يتم إعداد Google Sheets. يرجى تحديث warranty-check.js بمعرف الجدول.');
        showConfigurationWarning();
        return false;
    }
    
    console.log('✅ تم التحقق من الإعدادات بنجاح');
    console.log('📊 معرف الجدول:', CONFIG.SPREADSHEET_ID);
    return true;
}

/**
 * التعامل مع إرسال النموذج
 */
async function handleFormSubmit(event) {
    console.log('🔄 بدء معالجة النموذج...');
    
    // منع إعادة تحميل الصفحة
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const warrantyCode = elements.warrantyCodeInput.value.trim();
    console.log('🔍 رمز الضمان المدخل:', warrantyCode);
    
    // التحقق من جانب العميل
    if (!validateInput(warrantyCode)) {
        console.log('❌ فشل في التحقق من الإدخال');
        return false;
    }
    
    // إظهار حالة التحميل
    setLoadingState(true);
    
    try {
        console.log('🌐 بدء فحص رمز الضمان...');
        
        // فحص رمز الضمان مقابل Google Sheets CSV
        const warrantyData = await checkWarrantyCode(warrantyCode);
        
        if (warrantyData) {
            console.log('✅ تم العثور على بيانات الضمان:', warrantyData);
            
            // فحص حالة الضمان
            if (warrantyData.isExpired) {
                showExpiredWarrantyResult(warrantyData);
            } else {
                showSuccessResult(warrantyData);
            }
        } else {
            console.log('❌ لم يتم العثور على رمز الضمان');
            showErrorResult('رمز الضمان غير موجود', 'رمز الضمان الذي أدخلته غير موجود في قاعدة البيانات. يرجى التحقق من الرمز والمحاولة مرة أخرى.');
        }
    } catch (error) {
        console.error('💥 خطأ في فحص الضمان:', error);
        showErrorResult('خطأ في الاتصال', `فشل في الاتصال بقاعدة بيانات الضمان: ${error.message}`);
    } finally {
        setLoadingState(false);
    }
    
    return false; // منع إعادة تحميل الصفحة
}

/**
 * التحقق من صحة إدخال رمز الضمان
 */
function validateInput(warrantyCode) {
    const isValid = warrantyCode && warrantyCode.length > 0;
    
    if (!isValid) {
        elements.warrantyCodeInput.classList.add('is-invalid');
        elements.warrantyCodeInput.focus();
        
        // تأثير اهتزاز للخطأ
        elements.warrantyCodeInput.style.animation = 'errorShake 0.6s ease-in-out';
        setTimeout(() => {
            elements.warrantyCodeInput.style.animation = '';
        }, 600);
        
        return false;
    }
    
    elements.warrantyCodeInput.classList.remove('is-invalid');
    elements.warrantyCodeInput.classList.add('is-valid');
    return true;
}

/**
 * التعامل مع التحقق من الإدخال أثناء الكتابة
 */
function handleInputValidation() {
    const value = elements.warrantyCodeInput.value.trim();
    
    if (value.length > 0) {
        elements.warrantyCodeInput.classList.remove('is-invalid');
    }
}

/**
 * مسح فئات التحقق عند التركيز
 */
function clearValidation() {
    elements.warrantyCodeInput.classList.remove('is-invalid', 'is-valid');
}

/**
 * فحص رمز الضمان مقابل Google Sheets CSV
 */
async function checkWarrantyCode(warrantyCode) {
    const API_KEY = 'AIzaSyABocPBJTSOfOCCcNbwwRrVZozWlhTcQ7w'; // استبدل بـ API Key
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/1!A:G?key=${API_KEY}`;
    console.log('🔗 رابط API:', url);
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`خطأ HTTP! الحالة: ${response.status}`);
        }
        const data = await response.json();
        console.log('📊 البيانات:', data);
        
        const rows = data.values || [];
        if (rows.length === 0) {
            throw new Error('الجدول فارغ');
        }
        
        const warrantyRow = rows.slice(1).find(row => 
            row[CONFIG.COLUMNS.WARRANTY_CODE]?.toLowerCase().trim() === warrantyCode.toLowerCase().trim()
        );
        
        if (warrantyRow) {
            const firstName = warrantyRow[CONFIG.COLUMNS.FIRST_NAME] || '';
            const lastName = warrantyRow[CONFIG.COLUMNS.LAST_NAME] || '';
            const fullName = `${firstName} ${lastName}`.trim() || 'غير محدد';
            const warrantyPeriod = warrantyRow[CONFIG.COLUMNS.WARRANTY_PERIOD] || '';
            let warrantyDuration = 'غير محدد';
            if (warrantyPeriod) {
                const period = parseInt(warrantyPeriod);
                warrantyDuration = period === 1 ? 'سنة واحدة' : period === 2 ? 'سنتان' : period > 10 ? `${period} سنة` : `${period} سنوات`;
            }
            const endDateStr = warrantyRow[CONFIG.COLUMNS.END_DATE] || '';
            const warrantyStatus = checkWarrantyExpiry(endDateStr);
            
            return {
                warrantyCode: warrantyRow[CONFIG.COLUMNS.WARRANTY_CODE] || '',
                customerName: fullName,
                glassesModel: warrantyRow[CONFIG.COLUMNS.MODEL] || 'نظارة طبية',
                warrantyDuration: warrantyDuration,
                expirationDate: endDateStr || 'غير محدد',
                isExpired: warrantyStatus.isExpired,
                daysRemaining: warrantyStatus.daysRemaining,
                formattedEndDate: warrantyStatus.formattedDate
            };
        }
        return null;
    } catch (error) {
        console.error('💥 خطأ في Sheets API:', error);
        throw error;
    }
}

/**
 * فحص حالة انتهاء الضمان
 */
function checkWarrantyExpiry(endDateStr) {
    console.log('📅 فحص تاريخ انتهاء الضمان:', endDateStr);
    
    if (!endDateStr || endDateStr.trim() === '') {
        return {
            isExpired: false,
            daysRemaining: null,
            formattedDate: 'غير محدد'
        };
    }
    
    try {
        // تحليل التاريخ - يدعم عدة تنسيقات
        let endDate;
        
        // تنسيق dd-mm-yyyy (مثل 13-7-2026)
        if (endDateStr.includes('-')) {
            const parts = endDateStr.split('-');
            if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1; // الشهر يبدأ من 0
                const year = parseInt(parts[2]);
                endDate = new Date(year, month, day);
            }
        }
        // تنسيق dd/mm/yyyy
        else if (endDateStr.includes('/')) {
            const parts = endDateStr.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const year = parseInt(parts[2]);
                endDate = new Date(year, month, day);
            }
        }
        // محاولة تحليل التاريخ مباشرة
        else {
            endDate = new Date(endDateStr);
        }
        
        // التحقق من صحة التاريخ
        if (isNaN(endDate.getTime())) {
            console.warn('⚠️ تاريخ غير صحيح:', endDateStr);
            return {
                isExpired: false,
                daysRemaining: null,
                formattedDate: endDateStr
            };
        }
        
        // الحصول على التاريخ الحالي (بداية اليوم)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // تعيين نهاية يوم انتهاء الضمان
        endDate.setHours(23, 59, 59, 999);
        
        // حساب الفرق بالأيام
        const timeDiff = endDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        // تنسيق التاريخ للعرض
        const formattedDate = endDate.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        console.log('📊 نتائج فحص التاريخ:', {
            endDate: endDate,
            today: today,
            daysDiff: daysDiff,
            isExpired: daysDiff < 0
        });
        
        return {
            isExpired: daysDiff < 0,
            daysRemaining: daysDiff,
            formattedDate: formattedDate
        };
        
    } catch (error) {
        console.error('💥 خطأ في تحليل التاريخ:', error);
        return {
            isExpired: false,
            daysRemaining: null,
            formattedDate: endDateStr
        };
    }
}

/**
 * تحليل CSV بسيط
 */
function parseCSV(csvText) {
    console.log('🔧 بدء تحليل CSV...');
    
    const rows = [];
    const lines = csvText.split('\n');
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        let line = lines[lineIndex].trim();
        if (line.length === 0) continue;
        
        // تحليل بسيط للـ CSV (يتعامل مع الفواصل والاقتباس)
        const row = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        
        // إضافة العمود الأخير
        row.push(current.trim().replace(/^"|"$/g, ''));
        
        rows.push(row);
        console.log(`📝 الصف ${lineIndex + 1}:`, row);
    }
    
    console.log('✅ تم تحليل CSV بنجاح، العدد الإجمالي للصفوف:', rows.length);
    return rows;
}

/**
 * تعيين حالة التحميل
 */
function setLoadingState(isLoading) {
    if (isLoading) {
        elements.submitBtn.classList.add('btn-loading');
        elements.submitBtn.classList.remove('pulse');
        elements.submitBtn.disabled = true;
        elements.loadingSpinner.style.display = 'block';
        elements.resultsContainer.innerHTML = '';
        console.log('⏳ تم تفعيل حالة التحميل');
    } else {
        elements.submitBtn.classList.remove('btn-loading');
        elements.submitBtn.classList.add('pulse');
        elements.submitBtn.disabled = false;
        elements.loadingSpinner.style.display = 'none';
        console.log('✅ تم إلغاء حالة التحميل');
    }
}

/**
 * إظهار نتيجة النجاح مع بيانات الضمان
 */
function showSuccessResult(warrantyData) {
    console.log('🎉 عرض نتيجة النجاح');
    
    // تحديد لون ورسالة حالة الضمان
    let statusColor = 'success';
    let statusIcon = 'check-circle';
    let statusTitle = 'الضمان ساري المفعول';
    let statusMessage = 'ضمان نظارتك نشط وساري المفعول';
    let alertClass = 'alert-info';
    let alertMessage = '<strong>مهم:</strong> يرجى الاحتفاظ برمز الضمان في مكان آمن للرجوع إليه مستقبلاً.';
    
    // إذا كان الضمان قريب من الانتهاء (أقل من 30 يوم)
    if (warrantyData.daysRemaining !== null && warrantyData.daysRemaining <= 30 && warrantyData.daysRemaining > 0) {
        statusColor = 'warning';
        statusIcon = 'exclamation-triangle';
        statusTitle = 'الضمان ينتهي قريباً';
        statusMessage = `باقي ${warrantyData.daysRemaining} يوم على انتهاء الضمان`;
        alertClass = 'alert-warning';
        alertMessage = `<strong>تنبيه:</strong> الضمان سينتهي خلال ${warrantyData.daysRemaining} يوم. يرجى التواصل معنا إذا كنت تحتاج لأي خدمة.`;
    }
    
    const html = `
        <div class="result-card success-card card">
            <div class="card-body position-relative">
                <div class="floating-icon">
                    <i class="fas fa-${statusIcon} success-icon"></i>
                </div>
                
                <div class="d-flex align-items-center mb-4">
                    <i class="fas fa-${statusIcon} text-${statusColor} me-3 success-icon" style="font-size: 2.5rem;"></i>
                    <div>
                        <h4 class="mb-1 text-${statusColor} fw-bold">${statusTitle}</h4>
                        <p class="mb-0 text-muted">${statusMessage}</p>
                    </div>
                </div>
                
                <div class="warranty-info">
                    <div class="info-item">
                        <div class="info-label">
                            <i class="fas fa-user me-2"></i>اسم العميل
                        </div>
                        <div class="info-value">${escapeHtml(warrantyData.customerName)}</div>
                    </div>
                    
                    <div class="info-item">
                        <div class="info-label">
                            <i class="fas fa-glasses me-2"></i>موديل النظارة
                        </div>
                        <div class="info-value">${escapeHtml(warrantyData.glassesModel)}</div>
                    </div>
                    
                    <div class="info-item">
                        <div class="info-label">
                            <i class="fas fa-clock me-2"></i>مدة الضمان
                        </div>
                        <div class="info-value">${escapeHtml(warrantyData.warrantyDuration)}</div>
                    </div>
                    
                    <div class="info-item">
                        <div class="info-label">
                            <i class="fas fa-calendar-alt me-2"></i>تاريخ انتهاء الضمان
                        </div>
                        <div class="info-value">${escapeHtml(warrantyData.formattedEndDate)}</div>
                    </div>
                </div>
                
                <div class="alert ${alertClass} mt-4 mb-0" role="alert">
                    <i class="fas fa-info-circle me-2"></i>
                    ${alertMessage}
                </div>
            </div>
        </div>
    `;
    
    showResult(html);
}

/**
 * إظهار نتيجة الضمان المنتهي
 */
function showExpiredWarrantyResult(warrantyData) {
    console.log('⏰ عرض نتيجة الضمان المنتهي');
    
    const daysPassed = Math.abs(warrantyData.daysRemaining);
    
    const html = `
        <div class="result-card error-card card">
            <div class="card-body position-relative">
                <div class="floating-icon" style="background: var(--error-red);">
                    <i class="fas fa-clock error-icon"></i>
                </div>
                
                <div class="d-flex align-items-center mb-4">
                    <i class="fas fa-clock text-danger me-3 error-icon" style="font-size: 2.5rem;"></i>
                    <div>
                        <h4 class="mb-1 text-danger fw-bold">انتهت فترة الضمان</h4>
                        <p class="mb-0 text-muted">انتهت فترة ضمان هذه النظارة منذ ${daysPassed} يوم</p>
                    </div>
                </div>
                
                <div class="warranty-info">
                    <div class="info-item">
                        <div class="info-label">
                            <i class="fas fa-user me-2"></i>اسم العميل
                        </div>
                        <div class="info-value">${escapeHtml(warrantyData.customerName)}</div>
                    </div>
                    
                    <div class="info-item">
                        <div class="info-label">
                            <i class="fas fa-glasses me-2"></i>موديل النظارة
                        </div>
                        <div class="info-value">${escapeHtml(warrantyData.glassesModel)}</div>
                    </div>
                    
                    <div class="info-item">
                        <div class="info-label">
                            <i class="fas fa-clock me-2"></i>مدة الضمان الأصلية
                        </div>
                        <div class="info-value">${escapeHtml(warrantyData.warrantyDuration)}</div>
                    </div>
                    
                    <div class="info-item">
                        <div class="info-label">
                            <i class="fas fa-calendar-times me-2"></i>تاريخ انتهاء الضمان
                        </div>
                        <div class="info-value text-danger fw-bold">${escapeHtml(warrantyData.formattedEndDate)}</div>
                    </div>
                </div>
                
                <div class="alert alert-danger mt-4 mb-3" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>انتبه:</strong> انتهت فترة الضمان منذ ${daysPassed} يوم. لم تعد النظارة مشمولة بالضمان.
                </div>
                
                <div class="alert alert-info mb-0" role="alert">
                    <i class="fas fa-phone me-2"></i>
                    <strong>خدمات ما بعد الضمان:</strong>
                    <ul class="mb-0 mt-2">
                        <li>خدمات الصيانة المدفوعة متاحة</li>
                        <li>عروض خاصة على النظارات الجديدة</li>
                        <li>استشارة مجانية لتقييم حالة النظارة</li>
                        <li>تواصل معنا للحصول على عرض سعر</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    showResult(html);
}
/**
 * إظهار نتيجة الخطأ
 */
function showErrorResult(title, message) {
    console.log('❌ عرض نتيجة الخطأ:', title);
    
    const html = `
        <div class="result-card error-card card">
            <div class="card-body position-relative">
                <div class="floating-icon" style="background: var(--error-red);">
                    <i class="fas fa-exclamation-triangle error-icon"></i>
                </div>
                
                <div class="d-flex align-items-center mb-4">
                    <i class="fas fa-exclamation-triangle text-danger me-3 error-icon" style="font-size: 2.5rem;"></i>
                    <div>
                        <h4 class="mb-1 text-danger fw-bold">${escapeHtml(title)}</h4>
                        <p class="mb-0 text-muted">${escapeHtml(message)}</p>
                    </div>
                </div>
                
                <div class="alert alert-warning mb-0" role="alert">
                    <i class="fas fa-lightbulb me-2"></i>
                    <strong>اقتراحات:</strong>
                    <ul class="mb-0 mt-2">
                        <li>تأكد من صحة رمز الضمان المدخل</li>
                        <li>تأكد من استخدام التنسيق الصحيح</li>
                        <li>تواصل مع خدمة العملاء إذا استمرت المشكلة</li>
                        <li>تحقق من فاتورة الشراء أو كرت الضمان</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    showResult(html);
}

/**
 * إظهار تحذير الإعداد للتطوير
 */
function showConfigurationWarning() {
    const html = `
        <div class="result-card setup-card card">
            <div class="card-body">
                <div class="d-flex align-items-center mb-4">
                    <i class="fas fa-cog text-warning me-3" style="font-size: 2.5rem;"></i>
                    <div>
                        <h4 class="mb-1 text-warning fw-bold">مطلوب إعداد النظام</h4>
                        <p class="mb-0 text-muted">لم يتم إعداد Google Sheets بعد</p>
                    </div>
                </div>
                
                <div class="setup-steps">
                    <h5 class="text-primary mb-3">
                        <i class="fas fa-list-ol me-2"></i>خطوات الإعداد:
                    </h5>
                    <ol>
                        <li>إنشاء جدول Google Sheets جديد</li>
                        <li>إضافة الأعمدة التالية في الصف الأول:
                            <br><code>id</code> | <code>fName</code> | <code>lName</code> | <code>warantyKey</code> | <code>warantyPeriod</code> | <code>endDate</code> | <code>model</code>
                        </li>
                        <li>إضافة بيانات الضمان في الصفوف التالية</li>
                        <li>جعل الجدول عام: <strong>مشاركة</strong> → <strong>أي شخص لديه الرابط</strong> → <strong>عارض</strong></li>
                        <li>نسخ معرف الجدول من الرابط (الجزء بين <code>/d/</code> و <code>/edit</code>)</li>
                        <li>تحديث <code>SPREADSHEET_ID</code> في ملف <code>warranty-check.js</code></li>
                    </ol>
                </div>
                
                <div class="alert alert-info mt-3 mb-0" role="alert">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>مثال على رابط الجدول:</strong><br>
                    <small class="text-muted">
                        https://docs.google.com/spreadsheets/d/<strong>1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</strong>/edit<br>
                        معرف الجدول هو: <code>1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</code>
                    </small>
                </div>
            </div>
        </div>
    `;
    
    elements.resultsContainer.innerHTML = html;
    elements.resultsContainer.firstElementChild.classList.add('show');
}

/**
 * عرض النتيجة مع الأنيميشن
 */
function showResult(html) {
    elements.resultsContainer.innerHTML = html;
    
    // تشغيل الأنيميشن
    setTimeout(() => {
        const resultCard = elements.resultsContainer.querySelector('.result-card');
        if (resultCard) {
            resultCard.classList.add('show');
        }
    }, 100);
    
    // التمرير إلى النتائج على الجوال
    if (window.innerWidth <= 768) {
        setTimeout(() => {
            elements.resultsContainer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
        }, 400);
    }
}

/**
 * تشفير HTML لمنع هجمات XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * دالة تجريبية للاختبار (احذفها في الإنتاج)
 */
function runDemo() {
    console.log('🎬 تشغيل عرض توضيحي لفحص الضمان...');
    
    // محاكاة فحص ضمان ناجح
    setTimeout(() => {
        showSuccessResult({
            warrantyCode: 'DEMO123',
            customerName: 'أحمد محمد',
            glassesModel: 'نظارة طبية فاخرة',
            warrantyDuration: 'سنتان',
            expirationDate: '2025-12-31'
        });
    }, 1000);
}

// تصدير الدوال للاختبار (احذف في الإنتاج)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkWarrantyCode,
        validateInput,
        escapeHtml,
        parseCSV
    };
}